const { normalizeMoney } = require("@/domains/payments/controller/shared/helpers");
const {
  notifyFinanceMonthlyDelta,
} = require("@/services/telegramFinanceDeltaNotifier");

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
    refType = null,
    refId = null,
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

  // View finance.dashboard_monthly_summary is now dynamic, no need to write physically.
  await notifyFinanceMonthlyDelta({
    monthKey,
    revenueDelta: revenue,
    profitDelta: profit,
    importDelta: imp,
    refundDelta: 0,
    offFlowDelta: offFlow,
    bankBalanceDelta: bankBalance,
    context: "payments.applyDashboardDelta",
    refType,
    refId,
    executor: trx,
  });
};

module.exports = { applyDashboardDelta };
