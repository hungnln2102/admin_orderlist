const { fetchEstimatedBankBalancePair } = require("@/controllers/DashboardController/availableProfitFromSummary");
const {
  buildOrderCountBirthInRangeQuery,
} = require("@/controllers/DashboardController/dashboardSummaryQueries");
const { orderListHasCreatedAtColumn } = require("@/controllers/DashboardController/orderListHasCreatedAtColumn");
const { sumDailyKpisForRange } = require("@/controllers/DashboardController/dailyRevenueSummaryAggregate");
const {
  db,
  summaryTableName,
  summaryCols,
  toNumber,
  taxFromRevenueValue,
  currentCalendarMonthKey,
  computePreviousRange,
  kpiFromSummaryOnly,
} = require("@/controllers/DashboardController/service/shared");

const fetchDashboardStats = async () => {
  const now = new Date();
  const currentMonthKey = currentCalendarMonthKey(now);
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const [tableRows, estimatedBankBalance] = await Promise.all([
    db(summaryTableName)
      .select(
        summaryCols.MONTH_KEY,
        summaryCols.TOTAL_ORDERS,
        summaryCols.TOTAL_REVENUE,
        summaryCols.TOTAL_PROFIT,
        summaryCols.TOTAL_REFUND,
        summaryCols.TOTAL_IMPORT,
        summaryCols.TOTAL_TAX,
        summaryCols.ESTIMATED_BANK_BALANCE
      )
      .whereIn(summaryCols.MONTH_KEY, [currentMonthKey, previousMonthKey]),
    fetchEstimatedBankBalancePair({ currentMonthKey, previousMonthKey }),
  ]);

  const tableMap = new Map(
    (tableRows || []).map((r) => [String(r[summaryCols.MONTH_KEY] || ""), r])
  );

  const curr = kpiFromSummaryOnly(currentMonthKey, tableMap);
  const prev = kpiFromSummaryOnly(previousMonthKey, tableMap);

  const trC = tableMap.get(currentMonthKey);
  const trP = tableMap.get(previousMonthKey);
  const revC = toNumber(trC?.[summaryCols.TOTAL_REVENUE]);
  const revP = toNumber(trP?.[summaryCols.TOTAL_REVENUE]);
  const importC = toNumber(trC?.[summaryCols.TOTAL_IMPORT]);
  const importP = toNumber(trP?.[summaryCols.TOTAL_IMPORT]);
  const marginC = trC
    ? toNumber(trC[summaryCols.TOTAL_PROFIT])
    : revC - importC;
  const marginP = trP
    ? toNumber(trP[summaryCols.TOTAL_PROFIT])
    : revP - importP;
  const taxC = trC ? toNumber(trC[summaryCols.TOTAL_TAX]) : taxFromRevenueValue(revC);
  const taxP = trP ? toNumber(trP[summaryCols.TOTAL_TAX]) : taxFromRevenueValue(revP);

  return {
    totalOrders: { current: curr.total_orders, previous: prev.total_orders },
    totalRevenue: { current: revC, previous: revP },
    totalImports: {
      current: importC,
      previous: importP,
    },
    totalRefund: { current: curr.total_refund, previous: prev.total_refund },
    monthlyProfit: { current: marginC, previous: marginP },
    monthlyTax: {
      current: taxC,
      previous: taxP,
    },
    estimatedBankBalance,
    availableProfit: estimatedBankBalance,
  };
};

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

  const [currKpi, prevKpi, currOrd, prevOrd, estimatedBankBalance] = await Promise.all([
    sumDailyKpisForRange(from, to),
    sumDailyKpisForRange(p0, p1),
    db.raw(buildOrderCountBirthInRangeQuery({ useCreatedAt }), [from, to]),
    db.raw(buildOrderCountBirthInRangeQuery({ useCreatedAt }), [p0, p1]),
    fetchEstimatedBankBalancePair({ currentMonthKey, previousMonthKey }),
  ]);

  return {
    totalOrders: {
      current: toNumber(currOrd.rows?.[0]?.c),
      previous: toNumber(prevOrd.rows?.[0]?.c),
    },
    totalRevenue: {
      current: currKpi.earned,
      previous: prevKpi.earned,
    },
    totalImports: {
      current: currKpi.shopCost,
      previous: prevKpi.shopCost,
    },
    totalRefund: {
      current: currKpi.reversed,
      previous: prevKpi.reversed,
    },
    monthlyProfit: {
      current: currKpi.allocatedProfitTax,
      previous: prevKpi.allocatedProfitTax,
    },
    monthlyTax: {
      current: taxFromRevenueValue(currKpi.earned),
      previous: taxFromRevenueValue(prevKpi.earned),
    },
    estimatedBankBalance,
    availableProfit: estimatedBankBalance,
    range: { from, to, previousFrom: p0, previousTo: p1 },
  };
};

module.exports = {
  fetchDashboardStats,
  fetchDashboardStatsForDateRange,
};
