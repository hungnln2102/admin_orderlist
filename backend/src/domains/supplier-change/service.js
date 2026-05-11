/**
 * Service đổi NCC cho 1 đơn hàng.
 *
 * Luồng nghiệp vụ (theo yêu cầu user):
 *   1. Tính `new_cost = supplier_new.full_price × (remaining_days / total_days)`
 *      (prorate theo số ngày còn lại).
 *   2. Tuổi đơn (today - order_date):
 *        - ≤5 ngày (Flow A): cập nhật `order.cost` và `order.supply_id`. Nếu có
 *          log cost mới nhất thì cũng update theo (trigger DB không tự làm vì
 *          đã bị guard bởi GUC). Nếu NCC mới là Mavryk → xóa toàn bộ log của đơn.
 *        - >5 ngày + log mới nhất `ncc_payment_status = 'Chưa Thanh Toán'`
 *          (Flow B-unpaid): XÓA log đó, INSERT log mới NCC mới (skip insert khi
 *          NCC mới = Mavryk).
 *        - >5 ngày + log mới nhất `ncc_payment_status = 'Đã Thanh Toán'`
 *          (Flow B-paid): KHÔNG xóa log cũ. INSERT log hoàn (supply_id cũ,
 *          import_cost=0, refund_amount=R) + INSERT log NCC mới (skip khi Mavryk).
 *   3. NCC mới luôn cần `supplier_cost` (giá nhập) — trừ Mavryk được phép thiếu.
 *
 * Side effects ngoài transaction:
 *   - Trigger `trg_supplier_order_cost_log_dashboard_import` tự recalc
 *     `dashboard.dashboard_monthly_summary.total_import` + `total_profit` khi
 *     cost_log thay đổi.
 *
 * Lỗi → throw `ChangeSupplierError` với `.status` (HTTP code).
 */

const { db } = require("../../db");
const logger = require("../../utils/logger");
const { normalizeOrderRow } = require("../../controllers/Order/helpers/normalize");
const { todayYMDInVietnam } = require("../../utils/normalizers");
const { STATUS } = require("../../utils/statuses");
const {
  mergeSummaryUpdates,
} = require("../../controllers/Order/finance/dashboardSummary");
const {
  notifyFinanceMonthlyDelta,
} = require("../../services/telegramFinanceDeltaNotifier");
const {
  computeProratedCostForNewSupplier,
  computeRefundFromOldSupplier,
  computeOrderAgeDays,
  classifyFlowByAge,
  isMavrykSupplierName,
} = require("./priceCalculator");

/**
 * Status mà bình thường (theo trigger 091) phải có dòng log NCC.
 * Khi đơn đang ở các status này nhưng chưa có log (vì NCC cũ là Mavryk —
 * trigger DELETE log), service phải tạo log mới khi đổi sang NCC thực sự.
 *
 * NGOÀI RA, khi đổi sang Mavryk trên đơn ở status này: bắt buộc INSERT
 * "Mavryk marker log" (import_cost=0) — để `fn_recalc_dashboard_total_import`
 * vẫn tính profit cho đơn = price - order.cost = price (vì order.cost=0).
 * Không có marker → fn_recalc bỏ đơn khỏi profit hoàn toàn → profit GIẢM
 * thay vì TĂNG (sai luồng kinh doanh "đổi sang Mavryk = bỏ chi phí").
 */
const STATUSES_NEEDING_NCC_LOG = new Set([
  STATUS.PAID,
  STATUS.PROCESSING,
  STATUS.RENEWAL,
]);

/**
 * INSERT log marker cho Mavryk: import_cost=0, refund_amount=0,
 * ncc_payment_status='Đã Thanh Toán' (Mavryk nội bộ — không nợ).
 * Cần thiết để dashboard.dashboard_monthly_summary.total_import KHÔNG bị bỏ
 * khi recalc (trigger `fn_recalc_dashboard_total_import` chỉ tổng SUM(import_cost)
 * — log Mavryk có import_cost=0 nên không cộng thêm gì).
 */
async function insertMavrykMarkerLog(trx, { orderId, mavrykSupplyId, idOrderText }) {
  await insertCostLog(trx, {
    orderListId: orderId,
    supplyId: mavrykSupplyId,
    idOrder: idOrderText,
    importCost: 0,
    refundAmount: 0,
    nccPaymentStatus: NCC_STATUS_PAID,
  });
}

/**
 * Lấy `YYYY-MM` của thời điểm hiện tại (Asia/Ho_Chi_Minh) — dùng làm month_key
 * khi áp profit delta vào dashboard. Đơn giản hoá: dùng today từ caller.
 */
function monthKeyFromToday(todayYmd) {
  const s = String(todayYmd || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(0, 7);
  return null;
}

/**
 * Sau khi đổi NCC, điều chỉnh `total_profit` trên dashboard tháng `monthKey`:
 *   profit_delta = oldCost - newCost
 * Lý do: webhook (lúc khách thanh toán) đã cộng `profit += wire - oldCost`.
 * Khi cost đổi sang newCost mà status đã Đã TT thì phải bù chênh lệch — vì
 * `fn_recalc_dashboard_total_import` (migration 20260630140000) **chỉ** cập nhật
 * `total_import`, KHÔNG đụng `total_profit` để tránh ghi đè webhook.
 *
 * Áp dụng chỉ khi đơn ở status đã được webhook ghi profit (Đã TT / Đang Xử Lý /
 * Cần Gia Hạn — gọi chung là "đã có log NCC"); với Chưa TT thì chưa có profit
 * trên dashboard nên không cần điều chỉnh.
 */
async function applyProfitDeltaOnCostChange(
  trx,
  { orderId, oldCost, newCost, orderStatus, monthKey }
) {
  if (!STATUSES_NEEDING_NCC_LOG.has(orderStatus)) return 0;
  if (!monthKey) return 0;
  const delta = Number(oldCost || 0) - Number(newCost || 0);
  if (!Number.isFinite(delta) || delta === 0) return 0;
  await mergeSummaryUpdates(
    trx,
    monthKey,
    { total_profit: delta },
    { notify: false, context: "supplier-change.applyProfitDelta" }
  );
  logger.info("[supplier-change] applied profit delta", {
    orderId,
    monthKey,
    oldCost,
    newCost,
    profitDelta: delta,
  });
  return delta;
}
const {
  ORDER_COLS,
  SUPPLIER_COLS,
  SUMMARY_COLS,
  NCC_STATUS_UNPAID,
  NCC_STATUS_PAID,
  enableAppManagedFlag,
  findOrderById,
  findSupplierById,
  findSupplyPriceForVariant,
  findLatestCostLog,
  updateOrderSupplyAndCost,
  deleteCostLogById,
  updateLatestCostLog,
  insertCostLog,
  fetchMonthlyTotals,
} = require("./repository");

const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

class ChangeSupplierError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "ChangeSupplierError";
    this.status = status;
    if (details) this.details = details;
  }
}

const FLOWS = Object.freeze({
  A: "A",
  B_UNPAID: "B_UNPAID",
  B_PAID: "B_PAID",
  NOOP: "NOOP",
});

/**
 * @param {number} orderId
 * @param {number} newSupplyId
 * @param {{ trx?: import('knex').Knex.Transaction, today?: string }} [opts]
 * @returns {Promise<object>} kết quả + flow đã chạy
 */
async function changeOrderSupplier(orderId, newSupplyId, opts = {}) {
  if (!Number.isFinite(Number(orderId)) || Number(orderId) <= 0) {
    throw new ChangeSupplierError(400, "orderId không hợp lệ.");
  }
  if (!Number.isFinite(Number(newSupplyId)) || Number(newSupplyId) <= 0) {
    throw new ChangeSupplierError(400, "newSupplyId không hợp lệ.");
  }

  const numericOrderId = Number(orderId);
  const numericNewSupplyId = Number(newSupplyId);

  const run = async (trx) => executeChangeSupplier(trx, {
    orderId: numericOrderId,
    newSupplyId: numericNewSupplyId,
    today: opts.today || todayYMDInVietnam(),
  });

  if (opts.trx) {
    return run(opts.trx);
  }
  return db.transaction(run);
}

async function executeChangeSupplier(trx, { orderId, newSupplyId, today }) {
  await enableAppManagedFlag(trx);
  const monthKey = monthKeyFromToday(today);
  // Snapshot tổng hợp tháng TRƯỚC khi đổi NCC — để tính delta thật sau cùng.
  const beforeSnap = await fetchMonthlySnapshotSafe(trx, monthKey);
  let result;
  try {
    result = await executeChangeSupplierInner(trx, { orderId, newSupplyId, today });
  } finally {
    // Cho phép phần còn lại của transaction (nếu có) chạy trigger bình thường.
    await trx.raw(`SET LOCAL app.supplier_change_managed = 'off'`).catch(() => {});
  }

  // Gửi thông báo BIẾN ĐỘNG THÁNG nếu có chênh lệch sau khi đổi NCC.
  // Chỉ khi flow thực sự chạy (không NOOP) và có monthKey hợp lệ.
  if (monthKey && result?.flow && result.flow !== FLOWS.NOOP) {
    try {
      const afterSnap = await fetchMonthlySnapshotSafe(trx, monthKey);
      const revenueDelta = toNum(afterSnap?.total_revenue) - toNum(beforeSnap?.total_revenue);
      const profitDelta = toNum(afterSnap?.total_profit) - toNum(beforeSnap?.total_profit);
      const importDelta = toNum(afterSnap?.total_import) - toNum(beforeSnap?.total_import);
      const refundDelta = toNum(afterSnap?.total_refund) - toNum(beforeSnap?.total_refund);
      if (revenueDelta || profitDelta || importDelta || refundDelta) {
        await notifyFinanceMonthlyDelta({
          monthKey,
          revenueDelta,
          profitDelta,
          importDelta,
          refundDelta,
          context: `supplier-change[order=${orderId}, flow=${result.flow}]`,
          executor: trx,
        });
      }
    } catch (notifyErr) {
      // Notification lỗi không nên rollback transaction đổi NCC.
      logger.warn("[supplier-change] notify finance delta failed (non-fatal)", {
        orderId,
        error: notifyErr?.message,
      });
    }
  }

  return result;
}

async function fetchMonthlySnapshotSafe(trx, monthKey) {
  try {
    const row = await fetchMonthlyTotals(trx, monthKey);
    if (!row) return null;
    return {
      total_revenue: toNum(row[SUMMARY_COLS.TOTAL_REVENUE]),
      total_profit: toNum(row[SUMMARY_COLS.TOTAL_PROFIT]),
      total_import: toNum(row[SUMMARY_COLS.TOTAL_IMPORT]),
      total_refund: toNum(row[SUMMARY_COLS.TOTAL_REFUND]),
    };
  } catch {
    return null;
  }
}

async function executeChangeSupplierInner(trx, { orderId, newSupplyId, today }) {
  const order = await findOrderById(trx, orderId);
  if (!order) throw new ChangeSupplierError(404, "Không tìm thấy đơn hàng.");
  logger.info("[supplier-change] start", {
    orderId,
    newSupplyId,
    today,
    oldSupplyId: order[ORDER_COLS.ID_SUPPLY],
    orderStatus: order[ORDER_COLS.STATUS],
    orderCost: order[ORDER_COLS.COST],
    orderPrice: order[ORDER_COLS.PRICE],
    orderDays: order[ORDER_COLS.DAYS],
    orderDate: order[ORDER_COLS.ORDER_DATE],
    idOrder: order[ORDER_COLS.ID_ORDER],
  });

  const oldSupplyId = order[ORDER_COLS.ID_SUPPLY];
  if (Number(oldSupplyId) === Number(newSupplyId)) {
    return {
      flow: FLOWS.NOOP,
      orderId,
      message: "NCC mới trùng với NCC hiện tại; không thực hiện gì.",
    };
  }

  const newSupplier = await findSupplierById(trx, newSupplyId);
  if (!newSupplier) {
    throw new ChangeSupplierError(404, "Không tìm thấy NCC mới.");
  }

  const newSupplierName = newSupplier[SUPPLIER_COLS.SUPPLIER_NAME] ?? "";
  const isNewMavryk = isMavrykSupplierName(newSupplierName);

  const variantId = order[ORDER_COLS.ID_PRODUCT];

  let supplierFullPrice = null;
  if (!isNewMavryk && variantId != null && Number.isFinite(Number(variantId))) {
    supplierFullPrice = await findSupplyPriceForVariant(trx, newSupplyId, variantId);
  }

  if (supplierFullPrice == null && !isNewMavryk) {
    throw new ChangeSupplierError(
      400,
      `Chưa cấu hình giá nhập cho NCC mới (id=${newSupplyId}) với sản phẩm này.`,
      { supply_id: newSupplyId, variant_id: variantId }
    );
  }

  // Chuẩn hoá để lấy `so_ngay_con_lai` (đã có sẵn helper trong codebase).
  const normalized = normalizeOrderRow(
    {
      ...order,
      order_date_raw: order[ORDER_COLS.ORDER_DATE],
      expiry_date_raw: order[ORDER_COLS.EXPIRY_DATE],
    },
    today
  );

  const totalDays = Number(order[ORDER_COLS.DAYS] ?? 0);
  const remainingDays = Number(normalized?.so_ngay_con_lai ?? 0);

  // Mavryk = NCC nội bộ → giá nhập LUÔN = 0 (kể cả khi `supplier_cost` có row).
  const newCost = isNewMavryk
    ? 0
    : computeProratedCostForNewSupplier({
        fullPrice: supplierFullPrice ?? 0,
        totalDays,
        remainingDays,
      });

  const orderDateRaw = order[ORDER_COLS.ORDER_DATE];
  const ageDays = computeOrderAgeDays(orderDateRaw, today);
  const flowKind = classifyFlowByAge(ageDays);

  const idOrderText = String(order[ORDER_COLS.ID_ORDER] ?? "").trim();
  const oldCost = Number(order[ORDER_COLS.COST] ?? 0);
  const orderStatus = String(order[ORDER_COLS.STATUS] ?? "").trim();
  const monthKey = monthKeyFromToday(today);

  logger.info("[supplier-change] computed", {
    orderId,
    isNewMavryk,
    newSupplierName: newSupplier[SUPPLIER_COLS.SUPPLIER_NAME],
    supplierFullPrice,
    totalDays,
    remainingDays,
    newCost,
    ageDays,
    flowKind,
    orderStatus,
    monthKey,
  });

  if (flowKind === "A") {
    return await runFlowA(trx, {
      orderId,
      newSupplyId,
      newCost,
      oldCost,
      isNewMavryk,
      orderStatus,
      idOrderText,
      monthKey,
    });
  }

  const latestLog = await findLatestCostLog(trx, orderId);
  if (!latestLog) {
    // Đơn > 5 ngày nhưng chưa có log → fallback theo Flow A để tránh mất dữ liệu.
    return await runFlowA(trx, {
      orderId,
      newSupplyId,
      newCost,
      oldCost,
      isNewMavryk,
      orderStatus,
      idOrderText,
      monthKey,
    });
  }

  const nccPaymentStatus = String(latestLog.ncc_payment_status ?? "").trim();
  if (nccPaymentStatus === NCC_STATUS_UNPAID) {
    return await runFlowBUnpaid(trx, {
      orderId,
      newSupplyId,
      newCost,
      oldCost,
      isNewMavryk,
      latestLog,
      idOrderText,
      orderStatus,
      monthKey,
    });
  }

  if (nccPaymentStatus === NCC_STATUS_PAID) {
    const oldImportCost = Number(latestLog.import_cost ?? 0);
    const refundFromOld = computeRefundFromOldSupplier({
      oldImportCost,
      totalDays,
      remainingDays,
    });
    return await runFlowBPaid(trx, {
      orderId,
      oldSupplyId: latestLog.supply_id ?? oldSupplyId,
      newSupplyId,
      newCost,
      oldCost,
      isNewMavryk,
      refundFromOld,
      idOrderText,
      orderStatus,
      monthKey,
    });
  }

  logger.warn("[supplier-change] log có ncc_payment_status lạ — fallback Flow A.", {
    orderId,
    nccPaymentStatus,
  });
  return await runFlowA(trx, {
    orderId,
    newSupplyId,
    newCost,
    oldCost,
    isNewMavryk,
    orderStatus,
    idOrderText,
    monthKey,
  });
}

async function runFlowA(
  trx,
  { orderId, newSupplyId, newCost, oldCost, isNewMavryk, orderStatus, idOrderText, monthKey }
) {
  await updateOrderSupplyAndCost(trx, orderId, {
    supplyId: newSupplyId,
    cost: newCost,
  });

  // Webhook đã ghi profit theo oldCost; bù chênh lệch để dashboard tính đúng
  // theo cost mới (oldCost − newCost > 0 → profit tăng; < 0 → giảm).
  const profitDelta = await applyProfitDeltaOnCostChange(trx, {
    orderId,
    oldCost,
    newCost,
    orderStatus,
    monthKey,
  });

  if (isNewMavryk) {
    // Xóa log NCC cũ (Mavryk convention) ...
    await trx.raw(
      `DELETE FROM partner.supplier_order_cost_log WHERE order_list_id = ?`,
      [orderId]
    );
    // ... rồi INSERT Mavryk marker nếu đơn đang ở status cần có log để
    // dashboard tính profit = price - 0 = price (lợi nhuận TĂNG = +cost cũ).
    const needsMarker = STATUSES_NEEDING_NCC_LOG.has(orderStatus);
    if (needsMarker) {
      await insertMavrykMarkerLog(trx, {
        orderId,
        mavrykSupplyId: newSupplyId,
        idOrderText,
      });
    }
    return {
      flow: FLOWS.A,
      orderId,
      oldCost,
      newCost,
      profitDelta,
      mavrykNew: true,
      insertedLog: needsMarker,
      message: needsMarker
        ? "Flow A (≤5 ngày): NCC mới Mavryk → xóa log cũ + tạo marker (import=0) + bù profit delta."
        : "Flow A (≤5 ngày): NCC mới Mavryk → xóa log cũ (status không cần log).",
    };
  }

  // Nếu log đã tồn tại (đơn Đã TT) thì update sang NCC + cost mới.
  const latestLog = await findLatestCostLog(trx, orderId);
  if (latestLog) {
    await updateLatestCostLog(trx, latestLog.id, {
      supplyId: newSupplyId,
      importCost: newCost,
    });
    logger.info("[supplier-change] Flow A: updated existing log", {
      orderId,
      logId: latestLog.id,
      newSupplyId,
      newCost,
    });
    return {
      flow: FLOWS.A,
      orderId,
      oldCost,
      newCost,
      profitDelta,
      mavrykNew: false,
      insertedLog: false,
      message: "Flow A (≤5 ngày): cập nhật cost + đồng bộ log cost mới nhất + bù profit delta.",
    };
  }

  // Không có log nào — thường vì NCC cũ là Mavryk (trigger DB đã xóa log).
  // Nếu đơn ở status có log (Đã TT / ĐXL / Cần GH), tạo log mới với NCC mới
  // để dashboard total_import/total_profit recalc đúng.
  const needsLog = STATUSES_NEEDING_NCC_LOG.has(orderStatus);
  if (needsLog) {
    await insertCostLog(trx, {
      orderListId: orderId,
      supplyId: newSupplyId,
      idOrder: idOrderText,
      importCost: newCost,
      refundAmount: 0,
      nccPaymentStatus: NCC_STATUS_UNPAID,
    });
    logger.info("[supplier-change] Flow A: inserted new log (old NCC = Mavryk?)", {
      orderId,
      newSupplyId,
      newCost,
      orderStatus,
    });
    return {
      flow: FLOWS.A,
      orderId,
      oldCost,
      newCost,
      profitDelta,
      mavrykNew: false,
      insertedLog: true,
      message:
        "Flow A (≤5 ngày): không có log cũ (NCC cũ là Mavryk?) — tạo log mới cho NCC mới + bù profit delta để dashboard tính đúng.",
    };
  }

  // Đây là CASE BÌNH THƯỜNG (đổi NCC trên đơn "Chưa Thanh Toán"): chỉ
  // update `order.cost` + `order.supply_id`, chưa cần insert log NCC vì
  // chưa có giao dịch thanh toán cho khách. KHÔNG dùng `logger.warn` để
  // tránh forward thành "Backend Warning" qua Telegram (xem
  // `utils/logger.js` TelegramWarnTransport — sẽ spam khi user thao tác
  // đổi NCC nhiều lần). Dùng `info` đủ để debug khi cần.
  logger.info(
    "[supplier-change] Flow A: status không cần log NCC → chỉ update order.cost",
    { orderId, orderStatus, expectedStatuses: Array.from(STATUSES_NEEDING_NCC_LOG) }
  );
  return {
    flow: FLOWS.A,
    orderId,
    oldCost,
    newCost,
    profitDelta,
    mavrykNew: false,
    insertedLog: false,
    message: `Flow A (≤5 ngày): cập nhật cost; đơn ở status "${orderStatus}" không cần log NCC (không bù profit).`,
  };
}

async function runFlowBUnpaid(
  trx,
  {
    orderId,
    newSupplyId,
    newCost,
    oldCost,
    isNewMavryk,
    latestLog,
    idOrderText,
    orderStatus,
    monthKey,
  }
) {
  await deleteCostLogById(trx, latestLog.id);

  await updateOrderSupplyAndCost(trx, orderId, {
    supplyId: newSupplyId,
    cost: newCost,
  });

  const profitDelta = await applyProfitDeltaOnCostChange(trx, {
    orderId,
    oldCost,
    newCost,
    orderStatus,
    monthKey,
  });

  if (isNewMavryk) {
    await insertMavrykMarkerLog(trx, {
      orderId,
      mavrykSupplyId: newSupplyId,
      idOrderText,
    });
  } else {
    await insertCostLog(trx, {
      orderListId: orderId,
      supplyId: newSupplyId,
      idOrder: idOrderText,
      importCost: newCost,
      refundAmount: 0,
      nccPaymentStatus: NCC_STATUS_UNPAID,
    });
  }

  return {
    flow: FLOWS.B_UNPAID,
    orderId,
    oldCost,
    newCost,
    profitDelta,
    deletedLogId: latestLog.id,
    insertedNewLog: true,
    mavrykNew: isNewMavryk,
    message: isNewMavryk
      ? "Flow B (Chưa TT): xóa log cũ + Mavryk marker + bù profit delta."
      : "Flow B (Chưa TT): xóa log cũ + log mới NCC + bù profit delta.",
  };
}

async function runFlowBPaid(
  trx,
  {
    orderId,
    oldSupplyId,
    newSupplyId,
    newCost,
    oldCost,
    isNewMavryk,
    refundFromOld,
    idOrderText,
    orderStatus,
    monthKey,
  }
) {
  // Log hoàn từ NCC cũ — giữ nguyên log cũ (đã Đã TT), thêm dòng tracking refund.
  if (refundFromOld > 0 && oldSupplyId != null) {
    await insertCostLog(trx, {
      orderListId: orderId,
      supplyId: oldSupplyId,
      idOrder: idOrderText,
      importCost: 0,
      refundAmount: refundFromOld,
      nccPaymentStatus: NCC_STATUS_UNPAID,
    });
  }

  await updateOrderSupplyAndCost(trx, orderId, {
    supplyId: newSupplyId,
    cost: newCost,
  });

  const profitDelta = await applyProfitDeltaOnCostChange(trx, {
    orderId,
    oldCost,
    newCost,
    orderStatus,
    monthKey,
  });

  if (isNewMavryk) {
    await insertMavrykMarkerLog(trx, {
      orderId,
      mavrykSupplyId: newSupplyId,
      idOrderText,
    });
  } else {
    await insertCostLog(trx, {
      orderListId: orderId,
      supplyId: newSupplyId,
      idOrder: idOrderText,
      importCost: newCost,
      refundAmount: 0,
      nccPaymentStatus: NCC_STATUS_UNPAID,
    });
  }

  return {
    flow: FLOWS.B_PAID,
    orderId,
    oldCost,
    newCost,
    profitDelta,
    refundFromOldNcc: refundFromOld,
    insertedNewLog: true,
    mavrykNew: isNewMavryk,
    message: isNewMavryk
      ? "Flow B (Đã TT): giữ log cũ + log hoàn + Mavryk marker + bù profit delta."
      : "Flow B (Đã TT): giữ log cũ + log hoàn + log NCC mới + bù profit delta.",
  };
}

module.exports = {
  changeOrderSupplier,
  ChangeSupplierError,
  FLOWS,
};
