const {
  dailyRowMapBetween,
  sumDailyByMonthKeyBetween,
  sumDailyByYearKeyBetween,
} = require("../dailyRevenueSummaryAggregate");
const {
  db,
  summaryTableName,
  summaryCols,
  dailyRevCols,
  toNumber,
  taxFromRevenueValue,
  DASHBOARD_CHART_RANGE_DAY_MAX,
  inclusiveDaySpan,
  listIsoDaysInclusive,
  isFullCalendarMonth,
  formatChartDayLabel,
  monthKeysSpanned,
  yearKeysSpanned,
} = require("./shared");

const fetchDashboardChartsForDateRange = async ({ from, to, chartBucket }) => {
  const startYear = parseInt(String(from).slice(0, 4), 10);
  const daySpan = inclusiveDaySpan(from, to);
  const bucket = String(chartBucket || "").toLowerCase();
  const forceMonthBucket =
    bucket === "month" ||
    (bucket !== "day" && isFullCalendarMonth(from, to));
  const useDailyBuckets =
    bucket === "day" ||
    (bucket !== "year" &&
      !forceMonthBucket &&
      daySpan > 0 &&
      daySpan <= DASHBOARD_CHART_RANGE_DAY_MAX);

  if (useDailyBuckets) {
    const drMap = await dailyRowMapBetween(from, to);
    const daysList = listIsoDaysInclusive(from, to);
    const months = daysList.map((dayIso) => {
      const dr = drMap.get(dayIso);
      const earned = dr ? toNumber(dr[dailyRevCols.EARNED_REVENUE]) : 0;
      const rev = dr ? toNumber(dr[dailyRevCols.REVENUE_REVERSED]) : 0;
      const cost = dr ? toNumber(dr[dailyRevCols.TOTAL_SHOP_COST]) : 0;
      const allocProfit = dr
        ? toNumber(dr[dailyRevCols.ALLOCATED_PROFIT_TAX])
        : 0;
      return {
        month: formatChartDayLabel(dayIso),
        month_num: 0,
        month_key: dayIso,
        total_orders: dr
          ? toNumber(dr[dailyRevCols.DASHBOARD_ORDERS_COUNT])
          : 0,
        total_canceled: dr
          ? toNumber(dr[dailyRevCols.DASHBOARD_CANCELED_COUNT])
          : 0,
        total_revenue: earned,
        total_profit: allocProfit,
        total_refund: rev,
        total_import: cost,
        total_tax: taxFromRevenueValue(earned),
      };
    });
    return {
      year: Number.isFinite(startYear) ? startYear : null,
      months,
      range: { from, to },
      granularity: "day",
    };
  }

  if (bucket === "year") {
    const yearKeys = yearKeysSpanned(from, to);
    if (!yearKeys.length) {
      return {
        year: Number.isFinite(startYear) ? startYear : null,
        months: [],
        range: { from, to },
        granularity: "year",
      };
    }

    const finByYk = await sumDailyByYearKeyBetween(from, to);
    const months = yearKeys.map((yk) => {
      const f = finByYk.get(yk) || {
        earned: 0,
        reversed: 0,
        shopCost: 0,
        allocatedProfitTax: 0,
        dashboardOrders: 0,
        dashboardCanceled: 0,
      };
      const yn = parseInt(yk, 10);
      const earned = f.earned;
      const rev = f.reversed;
      const cost = f.shopCost;
      return {
        month: yk,
        month_num: Number.isFinite(yn) ? yn : 0,
        month_key: yk,
        total_orders: f.dashboardOrders,
        total_canceled: f.dashboardCanceled,
        total_revenue: earned,
        total_profit: f.allocatedProfitTax,
        total_refund: rev,
        total_import: cost,
        total_tax: taxFromRevenueValue(earned),
      };
    });

    return {
      year: Number.isFinite(startYear) ? startYear : null,
      months,
      range: { from, to },
      granularity: "year",
    };
  }

  const monthKeys = monthKeysSpanned(from, to);
  if (!monthKeys.length) {
    return {
      year: Number.isFinite(startYear) ? startYear : null,
      months: [],
      range: { from, to },
      granularity: "month",
    };
  }

  const finByMk = await sumDailyByMonthKeyBetween(from, to);
  const months = monthKeys.map((mk) => {
    const f = finByMk.get(mk) || {
      earned: 0,
      reversed: 0,
      shopCost: 0,
      allocatedProfitTax: 0,
      dashboardOrders: 0,
      dashboardCanceled: 0,
    };
    const [ys, ms] = mk.split("-");
    const monthNum = parseInt(ms, 10);
    const yearNum = parseInt(ys, 10);
    const earned = f.earned;
    const rev = f.reversed;
    const cost = f.shopCost;
    return {
      month: `T${monthNum}/${yearNum}`,
      month_num: monthNum,
      month_key: mk,
      total_orders: f.dashboardOrders,
      total_canceled: f.dashboardCanceled,
      total_revenue: earned,
      total_profit: f.allocatedProfitTax,
      total_refund: rev,
      total_import: cost,
      total_tax: taxFromRevenueValue(earned),
    };
  });

  return {
    year: Number.isFinite(startYear) ? startYear : null,
    months,
    range: { from, to },
    granularity: "month",
  };
};

const fetchDashboardChartsFromSummary = async ({ year, limitToToday }) => {
  const yearStr = String(year).padStart(4, "0");
  const now = new Date();
  const maxMonth =
    limitToToday && year === now.getFullYear() ? now.getMonth() + 1 : 12;

  const keys = [];
  for (let m = 1; m <= maxMonth; m++) {
    keys.push(`${yearStr}-${String(m).padStart(2, "0")}`);
  }

  const dbRows = await db(summaryTableName)
    .whereIn(summaryCols.MONTH_KEY, keys)
    .select(
      summaryCols.MONTH_KEY,
      summaryCols.TOTAL_ORDERS,
      summaryCols.CANCELED_ORDERS,
      summaryCols.TOTAL_REVENUE,
      summaryCols.TOTAL_PROFIT,
      summaryCols.TOTAL_REFUND,
      summaryCols.TOTAL_IMPORT,
      summaryCols.TOTAL_TAX,
      summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT,
      summaryCols.ESTIMATED_BANK_BALANCE
    );

  const rowByMk = new Map(
    (dbRows || []).map((r) => [String(r[summaryCols.MONTH_KEY] || "").trim(), r])
  );
  const months = [];
  for (let m = 1; m <= maxMonth; m++) {
    const mk = `${yearStr}-${String(m).padStart(2, "0")}`;
    const r = rowByMk.get(mk);
    const revenue = r ? toNumber(r[summaryCols.TOTAL_REVENUE]) : 0;
    const refund = r ? toNumber(r[summaryCols.TOTAL_REFUND]) : 0;
    const profitGross = r ? toNumber(r[summaryCols.TOTAL_PROFIT]) : 0;
    const taxStored = r ? toNumber(r[summaryCols.TOTAL_TAX]) : null;
    months.push({
      month: `T${m}`,
      month_num: m,
      month_key: mk,
      total_orders: r ? toNumber(r[summaryCols.TOTAL_ORDERS]) : 0,
      total_canceled: r ? toNumber(r[summaryCols.CANCELED_ORDERS]) : 0,
      total_revenue: revenue,
      total_profit: profitGross,
      total_refund: refund,
      total_import: r ? toNumber(r[summaryCols.TOTAL_IMPORT]) : 0,
      total_off_flow_bank_receipt: r
        ? toNumber(r[summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT])
        : 0,
      estimated_bank_balance: r
        ? toNumber(r[summaryCols.ESTIMATED_BANK_BALANCE])
        : 0,
      total_tax:
        taxStored != null && Number.isFinite(taxStored)
          ? taxStored
          : taxFromRevenueValue(revenue),
    });
  }

  return { year, months, granularity: "month" };
};

module.exports = {
  fetchDashboardChartsForDateRange,
  fetchDashboardChartsFromSummary,
};
