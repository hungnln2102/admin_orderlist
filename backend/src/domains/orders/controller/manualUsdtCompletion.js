const {
  ORDER_COLS,
  ORDER_TABLE,
  SUPPLIER_TABLE,
  SUPPLIER_COLS,
  pool,
} = require("../../../../webhook/sepay/config");
const { normalizeMoney, parseFlexibleDate } = require("../../../../webhook/sepay/utils");
const { STATUS: ORDER_STATUS } = require("@/utils/statuses");
const { isMavnImportOrder, isMavrykShopSupplierName } = require("@/utils/orderHelpers");
const {
  resolveDashboardImportDeltaOnPaid,
} = require("@/domains/orders/controller/finance/dashboardImportDeltaOnPaid");
const {
  monthKeyFromPaidDateYmd,
} = require("@/domains/orders/controller/finance/dashboardSummary");
const {
  notifyFinanceMonthlyDelta,
} = require("@/services/telegramFinanceDeltaNotifier");
const {
  ensureSupplyAndPriceFromOrder,
  updatePaymentSupplyBalance,
} = require("../../../../webhook/sepay/payments");
const {
  creditUsdtWalletFromOrder,
} = require("@/domains/wallet/usdt-wallets/services/usdtWalletLedgerService");
const {
  findUsdtWalletById,
  findDefaultActiveUsdtWallet,
} = require("@/domains/wallet/usdt-wallets/repositories/usdtWalletRepository");
const { toUsd } = require("@/domains/wallet/usdt-wallets/services/usdtWalletLedgerService");
const logger = require("@/utils/logger");

const toMonthKey = (value) => {
  const parsedDate = parseFlexibleDate(value);
  if (!parsedDate) return null;
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const incrementDashboardSummaryByDelta = async (
  client,
  monthKey,
  { revenueDelta = 0, profitDelta = 0, ordersDelta = 0, importDelta = 0 } = {}
) => {
  const revenue = normalizeMoney(revenueDelta);
  const profit = normalizeMoney(profitDelta);
  const orders = Number.isFinite(Number(ordersDelta)) ? Number(ordersDelta) : 0;
  const imp = normalizeMoney(importDelta);
  if (!monthKey) return;
  if (!revenue && !profit && !orders && !imp) return;

  // View finance.dashboard_monthly_summary is now dynamic, no need to write physically.
  await notifyFinanceMonthlyDelta({
    monthKey,
    revenueDelta: revenue,
    profitDelta: profit,
    importDelta: imp,
    refundDelta: 0,
    offFlowDelta: 0,
    context: "manualUsdt.incrementDashboardSummaryByDelta",
    executor: client,
  });
};

const fetchSupplierNameBySupplyId = async (client, supplyIdRaw) => {
  if (supplyIdRaw == null || !Number.isFinite(Number(supplyIdRaw))) return "";
  const { rows } = await client.query(
    `SELECT ${SUPPLIER_COLS.supplierName} FROM ${SUPPLIER_TABLE}
     WHERE ${SUPPLIER_COLS.id} = $1 LIMIT 1`,
    [Number(supplyIdRaw)]
  );
  return String(rows[0]?.[SUPPLIER_COLS.supplierName] ?? "").trim();
};

const resolveUsdtWalletForCompletion = async (walletId, orderWalletId) => {
  const preferredId = Number(walletId ?? orderWalletId);
  if (Number.isFinite(preferredId) && preferredId > 0) {
    const wallet = await findUsdtWalletById(preferredId);
    if (wallet && wallet.isActive !== false) return wallet;
  }
  return findDefaultActiveUsdtWallet();
};

const validateOrderForUsdtCompletion = async (client, normalizedId) => {
  const stateRes = await client.query(
    `SELECT
      ${ORDER_COLS.id},
      ${ORDER_COLS.idOrder},
      ${ORDER_COLS.status},
      ${ORDER_COLS.orderDate},
      ${ORDER_COLS.price},
      ${ORDER_COLS.cost},
      ${ORDER_COLS.idSupply},
      payment_method,
      usdt_amount_usd,
      usdt_exchange_rate,
      usdt_wallet_id
     FROM ${ORDER_TABLE}
     WHERE ${ORDER_COLS.id} = $1
     FOR UPDATE`,
    [normalizedId]
  );
  const state = stateRes.rows[0] || null;
  if (!state) {
    throw { status: 404, error: "Không tìm thấy đơn hàng." };
  }

  const paymentMethod = String(state.payment_method || "bank").trim().toLowerCase();
  if (paymentMethod !== "usdt") {
    throw { status: 400, error: "Đơn này không phải thanh toán USDT." };
  }

  const currentStatus = state[ORDER_COLS.status];
  if (currentStatus !== ORDER_STATUS.PROCESSING) {
    throw { status: 409, error: "Chỉ có thể xác nhận USDT thủ công đơn đang xử lý." };
  }

  const saleAmountVnd = normalizeMoney(state[ORDER_COLS.price]);
  const usdtAmountUsd = toUsd(state.usdt_amount_usd);
  if (saleAmountVnd <= 0 && usdtAmountUsd <= 0) {
    throw { status: 400, error: "Đơn USDT phải có số tiền VND hoặc USD hợp lệ." };
  }

  return { state, saleAmountVnd, usdtAmountUsd };
};

const resolveUsdtAmountToCredit = async (state, saleAmountVnd, usdtAmountUsd, options) => {
  const usdtWallet = await resolveUsdtWalletForCompletion(
    options.usdtWalletId ?? options.usdt_wallet_id,
    state.usdt_wallet_id
  );
  if (!usdtWallet) {
    throw { status: 400, error: "Vui lòng khai báo ví USDT mặc định trước khi xác nhận." };
  }

  const creditAmountUsd =
    usdtAmountUsd > 0
      ? usdtAmountUsd
      : toUsd(saleAmountVnd / Number(state.usdt_exchange_rate || 0));

  if (creditAmountUsd <= 0) {
    throw { status: 400, error: "Không tính được số USDT cần ghi nhận." };
  }

  return { usdtWallet, creditAmountUsd };
};

const updateDashboardAndSupplierStats = async (client, state, saleAmountVnd, orderCode) => {
  const cost = normalizeMoney(state[ORDER_COLS.cost]);
  const supplierId = state[ORDER_COLS.idSupply];
  const postedRevenueDelta = saleAmountVnd;
  const postedProfitDelta = normalizeMoney(saleAmountVnd - cost);
  const paidMonthKey =
    monthKeyFromPaidDateYmd(new Date().toISOString().slice(0, 10)) ||
    toMonthKey(new Date().toISOString());

  await incrementDashboardSummaryByDelta(client, paidMonthKey, {
    revenueDelta: postedRevenueDelta,
    profitDelta: postedRevenueDelta,
    ordersDelta: 1,
  });

  if (cost > 0) {
    const manualImportDelta = await resolveDashboardImportDeltaOnPaid(
      client,
      state,
      cost,
      fetchSupplierNameBySupplyId,
      paidMonthKey
    );
    await incrementDashboardSummaryByDelta(client, paidMonthKey, {
      profitDelta: -cost,
      importDelta: manualImportDelta,
    });
  }

  if (!isMavnImportOrder({ id_order: orderCode })) {
    const supplierName = await fetchSupplierNameBySupplyId(
      client,
      supplierId
    );
    if (!isMavrykShopSupplierName(supplierName)) {
      if (supplierId && Number.isFinite(cost)) {
        await updatePaymentSupplyBalance(supplierId, cost, new Date(), {
          client,
        });
      }
    }
  }

  return { postedRevenueDelta, postedProfitDelta };
};

const completeProcessingOrderWithManualUsdt = async (orderId, options = {}) => {
  const normalizedId = Number(orderId);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    return { status: 400, body: { error: "orderId không hợp lệ." } };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { state, saleAmountVnd, usdtAmountUsd } = await validateOrderForUsdtCompletion(client, normalizedId);
    const orderCode = String(state[ORDER_COLS.idOrder] || "").trim().toUpperCase();

    const { usdtWallet, creditAmountUsd } = await resolveUsdtAmountToCredit(
      state,
      saleAmountVnd,
      usdtAmountUsd,
      options
    );

    await creditUsdtWalletFromOrder(client, {
      walletId: usdtWallet.id,
      orderId: normalizedId,
      amountUsd: creditAmountUsd,
      exchangeRate: state.usdt_exchange_rate,
      vndEquivalent: saleAmountVnd,
      note: orderCode,
    });

    let resolvedSupplierId = state[ORDER_COLS.idSupply];
    let resolvedCost = normalizeMoney(state[ORDER_COLS.cost]);

    if (!isMavnImportOrder({ id_order: orderCode })) {
      const supplierName = await fetchSupplierNameBySupplyId(client, resolvedSupplierId);
      if (!isMavrykShopSupplierName(supplierName)) {
        const ensured = await ensureSupplyAndPriceFromOrder(orderCode, {
          referenceImport: saleAmountVnd,
          client,
        });
        if (ensured?.supplierId) {
          resolvedSupplierId = ensured.supplierId;
          resolvedCost = ensured.price;
        }
      }
    }

    state[ORDER_COLS.idSupply] = resolvedSupplierId;
    state[ORDER_COLS.cost] = resolvedCost;

    const statusUpdateResult = await client.query(
      `UPDATE ${ORDER_TABLE}
       SET ${ORDER_COLS.status} = $2,
           ${ORDER_COLS.idSupply} = $4,
           ${ORDER_COLS.cost} = $5
       WHERE ${ORDER_COLS.id} = $1
         AND ${ORDER_COLS.status} = $3
       RETURNING *`,
      [normalizedId, ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING, resolvedSupplierId, resolvedCost]
    );
    if (!statusUpdateResult.rowCount) {
      await client.query("ROLLBACK");
      return {
        status: 409,
        body: { error: "Trạng thái đơn đã thay đổi, vui lòng tải lại danh sách." },
      };
    }

    const { postedRevenueDelta, postedProfitDelta } = await updateDashboardAndSupplierStats(
      client,
      state,
      saleAmountVnd,
      orderCode
    );

    await client.query("COMMIT");
    return {
      status: 200,
      body: {
        message: "Đã xác nhận thanh toán USDT và cộng vào ví.",
        order: statusUpdateResult.rows[0],
        usdt_credited_usd: creditAmountUsd,
        wallet_id: usdtWallet.id,
        posted_revenue: postedRevenueDelta,
        posted_profit: postedProfitDelta,
      },
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      logger.error("[manual-usdt] rollback failed", { error: rollbackError.message });
    }
    if (error.status) {
      return { status: error.status, body: { error: error.error } };
    }
    logger.error("[manual-usdt] complete processing order failed", {
      orderId: normalizedId,
      error: error.message,
      stack: error.stack,
    });
    return { status: 500, body: { error: "Không thể xác nhận thanh toán USDT." } };
  } finally {
    client.release();
  }
};


module.exports = {
  completeProcessingOrderWithManualUsdt,
};
