const { fetchEstimatedBankBalancePair } = require("@/controllers/DashboardController/availableProfitFromSummary");
const {
  buildRangeCompareStatsQuery,
} = require("@/controllers/DashboardController/summaryQueries/rangeCompare");
const { orderListHasCreatedAtColumn } = require("@/controllers/DashboardController/orderListHasCreatedAtColumn");
const {
  db,
  toNumber,
  taxFromRevenueValue,
  currentCalendarMonthKey,
  computePreviousRange,
} = require("@/controllers/DashboardController/service/shared");

const fetchDashboardStatsForDateRange = async ({ from, to }) => {
  const { p0, p1 } = computePreviousRange(from, to);
  const currentMonthKey = currentCalendarMonthKey();
  const [cy, cm] = String(currentMonthKey).split("-").map(Number);
  const prevDate = new Date(cy, (cm || 1) - 2, 1);
  const previousMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  let useCreatedAt = true;
  try {
    useCreatedAt = await orderListHasCreatedAtColumn();
  } catch {
    useCreatedAt = true;
  }

  const [compareRes, estimatedBankBalance] = await Promise.all([
    db.raw(buildRangeCompareStatsQuery({ useCreatedAt }), [from, to, p0, p1]),
    fetchEstimatedBankBalancePair({ currentMonthKey, previousMonthKey }),
  ]);

  const row = compareRes?.rows?.[0] || {};

  const totalOrdersCurr = toNumber(row.total_orders_curr);
  const totalOrdersPrev = toNumber(row.total_orders_prev);
  const revC = toNumber(row.net_revenue_curr);
  const revP = toNumber(row.net_revenue_prev);
  const importC = toNumber(row.total_cost_curr);
  const importP = toNumber(row.total_cost_prev);
  const refundC = toNumber(row.total_refund_curr);
  const refundP = toNumber(row.total_refund_prev);
  const marginC = revC - importC - refundC;
  const marginP = revP - importP - refundP;

  return {
    totalOrders: {
      current: totalOrdersCurr,
      previous: totalOrdersPrev,
    },
    totalRevenue: {
      current: revC,
      previous: revP,
    },
    totalImports: {
      current: importC,
      previous: importP,
    },
    totalRefund: {
      current: refundC,
      previous: refundP,
    },
    monthlyProfit: {
      current: marginC,
      previous: marginP,
    },
    monthlyTax: {
      current: taxFromRevenueValue(revC),
      previous: taxFromRevenueValue(revP),
    },
    estimatedBankBalance,
    availableProfit: estimatedBankBalance,
    range: { from, to, previousFrom: p0, previousTo: p1 },
  };
};

const fetchDashboardStats = async () => {
  const now = new Date();
  const currentMonthKey = currentCalendarMonthKey(now);
  const [cy, cm] = currentMonthKey.split("-").map(Number);
  const lastDayCurr = new Date(cy, cm, 0).getDate();
  const from = `${currentMonthKey}-01`;
  const to = `${currentMonthKey}-${String(lastDayCurr).padStart(2, "0")}`;

  return fetchDashboardStatsForDateRange({ from, to });
};

module.exports = {
  fetchDashboardStats,
  fetchDashboardStatsForDateRange,
};
