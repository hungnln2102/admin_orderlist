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
const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("@/config/dbSchema");
const {
  qualifiedSummaryCol,
  recomputeSummaryMonthTotalTax,
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
} = require("@/domains/usdt-wallets/services/usdtWalletLedgerService");
const {
  findUsdtWalletById,
  findDefaultActiveUsdtWallet,
} = require("@/domains/usdt-wallets/repositories/usdtWalletRepository");
const { toUsd } = require("@/domains/usdt-wallets/services/usdtWalletLedgerService");
const logger = require("@/utils/logger");

const summaryTable = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

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

  await client.query(
    `
      INSERT INTO ${summaryTable} (
        ${summaryCols.MONTH_KEY},
        ${summaryCols.TOTAL_ORDERS},
        ${summaryCols.TOTAL_REVENUE},
        ${summaryCols.TOTAL_PROFIT},
        ${summaryCols.TOTAL_IMPORT},
        ${summaryCols.UPDATED_AT}
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (${summaryCols.MONTH_KEY})
      DO UPDATE SET
        ${summaryCols.TOTAL_ORDERS} = GREATEST(0, ${qualifiedSummaryCol(summaryCols.TOTAL_ORDERS)} + EXCLUDED.${summaryCols.TOTAL_ORDERS}),
        ${summaryCols.TOTAL_REVENUE} = ${qualifiedSummaryCol(summaryCols.TOTAL_REVENUE)} + EXCLUDED.${summaryCols.TOTAL_REVENUE},
        ${summaryCols.TOTAL_PROFIT} = ${qualifiedSummaryCol(summaryCols.TOTAL_PROFIT)} + EXCLUDED.${summaryCols.TOTAL_PROFIT},
        ${summaryCols.TOTAL_IMPORT} = GREATEST(0, ${qualifiedSummaryCol(summaryCols.TOTAL_IMPORT)} + EXCLUDED.${summaryCols.TOTAL_IMPORT}),
        ${summaryCols.UPDATED_AT} = NOW()
    `,
    [monthKey, orders, revenue, profit, imp]
  );
  await recomputeSummaryMonthTotalTax(client, monthKey);
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

const completeProcessingOrderWithManualUsdt = async (orderId, options = {}) => {
  const normalizedId = Number(orderId);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    return { status: 400, body: { error: "orderId không hợp lệ." } };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

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
      await client.query("ROLLBACK");
      return { status: 404, body: { error: "Không tìm thấy đơn hàng." } };
    }

    const paymentMethod = String(state.payment_method || "bank").trim().toLowerCase();
    if (paymentMethod !== "usdt") {
      await client.query("ROLLBACK");
      return {
        status: 400,
        body: { error: "Đơn này không phải thanh toán USDT." },
      };
    }

    const orderCode = String(state[ORDER_COLS.idOrder] || "").trim().toUpperCase();
    const currentStatus = state[ORDER_COLS.status];

    if (currentStatus !== ORDER_STATUS.PROCESSING) {
      await client.query("ROLLBACK");
      return {
        status: 409,
        body: { error: "Chỉ có thể xác nhận USDT thủ công đơn đang xử lý." },
      };
    }

    const saleAmountVnd = normalizeMoney(state[ORDER_COLS.price]);
    const usdtAmountUsd = toUsd(state.usdt_amount_usd);
    if (saleAmountVnd <= 0 && usdtAmountUsd <= 0) {
      await client.query("ROLLBACK");
      return {
        status: 400,
        body: { error: "Đơn USDT phải có số tiền VND hoặc USD hợp lệ." },
      };
    }

    const usdtWallet = await resolveUsdtWalletForCompletion(
      options.usdtWalletId ?? options.usdt_wallet_id,
      state.usdt_wallet_id
    );
    if (!usdtWallet) {
      await client.query("ROLLBACK");
      return {
        status: 400,
        body: { error: "Vui lòng khai báo ví USDT mặc định trước khi xác nhận." },
      };
    }

    const creditAmountUsd =
      usdtAmountUsd > 0
        ? usdtAmountUsd
        : toUsd(saleAmountVnd / Number(state.usdt_exchange_rate || 0));

    if (creditAmountUsd <= 0) {
      await client.query("ROLLBACK");
      return {
        status: 400,
        body: { error: "Không tính được số USDT cần ghi nhận." },
      };
    }

    await creditUsdtWalletFromOrder(client, {
      walletId: usdtWallet.id,
      orderId: normalizedId,
      amountUsd: creditAmountUsd,
      exchangeRate: state.usdt_exchange_rate,
      vndEquivalent: saleAmountVnd,
      note: orderCode,
    });

    const statusUpdateResult = await client.query(
      `UPDATE ${ORDER_TABLE}
       SET ${ORDER_COLS.status} = $2
       WHERE ${ORDER_COLS.id} = $1
         AND ${ORDER_COLS.status} = $3
       RETURNING *`,
      [normalizedId, ORDER_STATUS.PAID, ORDER_STATUS.PROCESSING]
    );
    if (!statusUpdateResult.rowCount) {
      await client.query("ROLLBACK");
      return {
        status: 409,
        body: { error: "Trạng thái đơn đã thay đổi, vui lòng tải lại danh sách." },
      };
    }

    const cost = normalizeMoney(state[ORDER_COLS.cost]);
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

    let manualImportDelta = 0;
    if (cost > 0) {
      manualImportDelta = await resolveDashboardImportDeltaOnPaid(
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
        state[ORDER_COLS.idSupply]
      );
      if (!isMavrykShopSupplierName(supplierName)) {
        const ensured = await ensureSupplyAndPriceFromOrder(orderCode, {
          referenceImport: saleAmountVnd,
          client,
        });
        if (ensured?.supplierId && Number.isFinite(ensured.price)) {
          await updatePaymentSupplyBalance(ensured.supplierId, ensured.price, new Date(), {
            client,
          });
        }
      }
    }

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
