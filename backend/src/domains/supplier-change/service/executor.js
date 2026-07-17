const logger = require("@/utils/logger");
const { normalizeOrderRow } = require("@/domains/orders/controller/helpers/normalize");
const {
  computeProratedCostForNewSupplier,
  computeRefundFromOldSupplier,
  computeOrderAgeDays,
  classifyFlowByAge,
  isMavrykSupplierName,
} = require("@/domains/supplier-change/priceCalculator");
const {
  ORDER_COLS,
  SUPPLIER_COLS,
  NCC_STATUS_UNPAID,
  NCC_STATUS_PAID,
  enableAppManagedFlag,
  findOrderById,
  findSupplierById,
  findSupplyPriceForVariant,
  findLatestCostLog,
} = require("@/domains/supplier-change/repository");
const { ChangeSupplierError } = require("@/domains/supplier-change/service/errors");
const { FLOWS } = require("@/domains/supplier-change/service/constants");
const {
  monthKeyFromToday,
  fetchMonthlySnapshotSafe,
  notifyMonthlyDeltaSafe,
} = require("@/domains/supplier-change/service/summary");
const { runFlowA, runFlowBUnpaid, runFlowBPaid } = require("@/domains/supplier-change/service/flowHandlers");

async function executeChangeSupplier(trx, { orderId, newSupplyId, today }) {
  await enableAppManagedFlag(trx);
  const monthKey = monthKeyFromToday(today);
  const beforeSnap = await fetchMonthlySnapshotSafe(trx, monthKey);
  let result;
  try {
    result = await executeChangeSupplierInner(trx, { orderId, newSupplyId, today });
  } finally {
    await trx.raw(`SET LOCAL app.supplier_change_managed = 'off'`).catch(() => {});
  }

  await notifyMonthlyDeltaSafe(trx, {
    monthKey,
    orderId,
    flow: result?.flow,
    beforeSnap,
  });
  return result;
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
  const newCost = isNewMavryk
    ? 0
    : computeProratedCostForNewSupplier({
        fullPrice: supplierFullPrice ?? 0,
        totalDays,
        remainingDays,
      });

  const ageDays = computeOrderAgeDays(order[ORDER_COLS.ORDER_DATE], today);
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
    return runFlowA(trx, {
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
    // > 5 ngày nhưng không có log NCC → fallback Flow A.
    // Tính prorated refund từ NCC cũ (không phải full cost).
    const proratedOldRefund = computeRefundFromOldSupplier({
      oldImportCost: oldCost,
      totalDays,
      remainingDays,
    });
    return runFlowA(trx, {
      orderId,
      newSupplyId,
      newCost,
      oldCost,
      isNewMavryk,
      orderStatus,
      idOrderText,
      monthKey,
      effectiveOldCostRefund: proratedOldRefund,
    });
  }

  const nccPaymentStatus = String(latestLog.ncc_payment_status ?? "").trim();
  if (nccPaymentStatus === NCC_STATUS_UNPAID) {
    return runFlowBUnpaid(trx, {
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
    return runFlowBPaid(trx, {
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
      effectiveOldCostRefund: refundFromOld,
    });
  }

  logger.warn("[supplier-change] log có ncc_payment_status lạ — fallback Flow A.", {
    orderId,
    nccPaymentStatus,
  });
  return runFlowA(trx, {
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

module.exports = {
  executeChangeSupplier,
};
