const { TABLES, SUMMARY_COLS } = require("./constants");
const { normalizeMoney } = require("./helpers");
const {
  recomputeSummaryMonthTotalTax,
} = require("../../../orders/controller/finance/dashboardSummary");
const {
  notifyFinanceMonthlyDelta,
} = require("../../../../services/telegramFinanceDeltaNotifier");

/**
 * Cập nhật dashboard_monthly_summary cho 1 tháng theo delta tích lũy (revenue/profit/orders/off-flow/bank-balance)
 * và notify Telegram khi có biến động. Dùng riêng cho luồng `reconcile` của payments — không trùng với
 * `mergeSummaryUpdates` ở `dashboardSummary.js` vì hỗ trợ off-flow + bank-balance trong cùng một UPSERT.
 */
const applyDashboardDelta = async (
  trx,
  monthKey,
  {
    revenueDelta = 0,
    profitDelta = 0,
    ordersDelta = 0,
    importDelta = 0,
    offFlowDelta = 0,
    bankBalanceDelta = 0,
  } = {}
) => {
  if (!monthKey) return;
  const revenue = normalizeMoney(revenueDelta);
  const profit = normalizeMoney(profitDelta);
  const orders = Number.isFinite(Number(ordersDelta)) ? Number(ordersDelta) : 0;
  const imp = normalizeMoney(importDelta);
  const offFlow = normalizeMoney(offFlowDelta);
  const bankBalance = normalizeMoney(bankBalanceDelta);
  if (!revenue && !profit && !orders && !imp && !offFlow && !bankBalance) return;

  await trx.raw(
    `
      INSERT INTO ${TABLES.dashboardSummary} (
        ${SUMMARY_COLS.monthKey},
        ${SUMMARY_COLS.totalOrders},
        ${SUMMARY_COLS.totalRevenue},
        ${SUMMARY_COLS.totalProfit},
        ${SUMMARY_COLS.totalImport},
        ${SUMMARY_COLS.totalOffFlowBankReceipt},
        ${SUMMARY_COLS.estimatedBankBalance},
        ${SUMMARY_COLS.updatedAt}
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      ON CONFLICT (${SUMMARY_COLS.monthKey})
      DO UPDATE SET
        ${SUMMARY_COLS.totalOrders} = GREATEST(0, ${TABLES.dashboardSummary}.${SUMMARY_COLS.totalOrders} + EXCLUDED.${SUMMARY_COLS.totalOrders}),
        ${SUMMARY_COLS.totalRevenue} = ${TABLES.dashboardSummary}.${SUMMARY_COLS.totalRevenue} + EXCLUDED.${SUMMARY_COLS.totalRevenue},
        ${SUMMARY_COLS.totalProfit} = ${TABLES.dashboardSummary}.${SUMMARY_COLS.totalProfit} + EXCLUDED.${SUMMARY_COLS.totalProfit},
        ${SUMMARY_COLS.totalImport} = GREATEST(0, ${TABLES.dashboardSummary}.${SUMMARY_COLS.totalImport} + EXCLUDED.${SUMMARY_COLS.totalImport}),
        ${SUMMARY_COLS.totalOffFlowBankReceipt} = ${TABLES.dashboardSummary}.${SUMMARY_COLS.totalOffFlowBankReceipt} + EXCLUDED.${SUMMARY_COLS.totalOffFlowBankReceipt},
        ${SUMMARY_COLS.estimatedBankBalance} = ${TABLES.dashboardSummary}.${SUMMARY_COLS.estimatedBankBalance} + EXCLUDED.${SUMMARY_COLS.estimatedBankBalance},
        ${SUMMARY_COLS.updatedAt} = NOW();
    `,
    [monthKey, orders, revenue, profit, imp, offFlow, bankBalance]
  );
  await recomputeSummaryMonthTotalTax(trx, monthKey);
  await notifyFinanceMonthlyDelta({
    monthKey,
    revenueDelta: revenue,
    profitDelta: profit,
    importDelta: imp,
    refundDelta: 0,
    offFlowDelta: offFlow,
    bankBalanceDelta: bankBalance,
    context: "payments.applyDashboardDelta",
    executor: trx,
  });
};

module.exports = { applyDashboardDelta };
