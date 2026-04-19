const { db } = require("../../db");
const {
  buildChartsQuery,
  buildYearsQuery,
  buildRangeCompareStatsQuery,
  buildRangeMonthlyChartQuery,
} = require("./queries");
const { tableName, SCHEMA_FINANCE, FINANCE_SCHEMA } = require("../../config/dbSchema");
const { dashboardMonthlyTaxRatePercent } = require("../../config/appConfig");

const summaryTableName = tableName(
  FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE,
  SCHEMA_FINANCE
);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;
const expenseTableName = tableName(
  FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.TABLE,
  SCHEMA_FINANCE
);
const expenseCols = FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.COLS;

const MS_PER_DAY = 86400000;

const pad2 = (n) => String(n).padStart(2, "0");

const toYMDDate = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseYMDLocal = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const computePreviousRange = (fromStr, toStr) => {
  const from = parseYMDLocal(fromStr);
  const to = parseYMDLocal(toStr);
  const inclusiveDays =
    Math.round((to.getTime() - from.getTime()) / MS_PER_DAY) + 1;
  const prevEnd = new Date(from.getTime() - MS_PER_DAY);
  const prevStart = new Date(
    prevEnd.getTime() - (inclusiveDays - 1) * MS_PER_DAY
  );
  return { p0: toYMDDate(prevStart), p1: toYMDDate(prevEnd) };
};

const taxFromRevenueValue = (revenue) =>
  Math.round((Number(revenue) || 0) * (dashboardMonthlyTaxRatePercent / 100));

const toNumber = (value) => Number(value || 0);

const sumWithdrawProfitBetweenDates = async ({ from, to }) => {
  const row = await db(expenseTableName)
    .where(expenseCols.EXPENSE_TYPE, "withdraw_profit")
    .whereRaw(`DATE(${expenseCols.CREATED_AT}) >= ?`, [from])
    .whereRaw(`DATE(${expenseCols.CREATED_AT}) <= ?`, [to])
    .sum({ total: expenseCols.AMOUNT })
    .first();
  return toNumber(row?.total);
};

const fetchMonthlyWithdrawProfitPair = async ({ monthStartDate }) => {
  const monthStart = parseYMDLocal(monthStartDate);
  const nextMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const prevMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const prevMonthEnd = new Date(monthStart.getTime() - MS_PER_DAY);

  const [currentMonthWithdraw, previousMonthWithdraw] = await Promise.all([
    sumWithdrawProfitBetweenDates({
      from: toYMDDate(monthStart),
      to: toYMDDate(new Date(nextMonthStart.getTime() - MS_PER_DAY)),
    }),
    sumWithdrawProfitBetweenDates({
      from: toYMDDate(prevMonthStart),
      to: toYMDDate(prevMonthEnd),
    }),
  ]);

  return {
    current: currentMonthWithdraw,
    previous: previousMonthWithdraw,
  };
};

const fetchAvailableProfitPair = async ({ currentMonthKey, monthStartDate }) => {
  const [profitAllRow, profitBeforeRow, expenseAllRow, expenseBeforeRow] =
    await Promise.all([
      db(summaryTableName)
        .sum({ total: summaryCols.TOTAL_PROFIT })
        .first(),
      db(summaryTableName)
        .where(summaryCols.MONTH_KEY, "<", currentMonthKey)
        .sum({ total: summaryCols.TOTAL_PROFIT })
        .first(),
      db(expenseTableName)
        .sum({ total: expenseCols.AMOUNT })
        .first(),
      db(expenseTableName)
        .whereRaw(`DATE(${expenseCols.CREATED_AT}) < ?`, [monthStartDate])
        .sum({ total: expenseCols.AMOUNT })
        .first(),
    ]);

  const profitAll = toNumber(profitAllRow?.total);
  const profitBefore = toNumber(profitBeforeRow?.total);
  const expenseAll = toNumber(expenseAllRow?.total);
  const expenseBefore = toNumber(expenseBeforeRow?.total);

  return {
    current: profitAll - expenseAll,
    previous: profitBefore - expenseBefore,
  };
};

const fetchDashboardStats = async () => {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStartDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const [rows, availableProfit, monthlyWithdrawProfit] = await Promise.all([
    db(summaryTableName)
      .whereIn(summaryCols.MONTH_KEY, [currentMonthKey, previousMonthKey]),
    fetchAvailableProfitPair({ currentMonthKey, monthStartDate }),
    fetchMonthlyWithdrawProfitPair({ monthStartDate }),
  ]);

  const currentRow = rows.find((r) => r.month_key === currentMonthKey) || {};
  const previousRow = rows.find((r) => r.month_key === previousMonthKey) || {};

  const curr = {
    total_orders: Number(currentRow.total_orders || 0),
    total_revenue: Number(currentRow.total_revenue || 0),
    total_profit: Number(currentRow.total_profit || 0),
    total_refund: Number(currentRow.total_refund || 0),
  };

  const prev = {
    total_orders: Number(previousRow.total_orders || 0),
    total_revenue: Number(previousRow.total_revenue || 0),
    total_profit: Number(previousRow.total_profit || 0),
    total_refund: Number(previousRow.total_refund || 0),
  };
  const currentMonthlyProfit = curr.total_profit - monthlyWithdrawProfit.current;
  const previousMonthlyProfit = prev.total_profit - monthlyWithdrawProfit.previous;

  const taxFromRevenue = (revenue) => taxFromRevenueValue(revenue);

  return {
    totalOrders: { current: curr.total_orders, previous: prev.total_orders },
    totalRevenue: { current: curr.total_revenue, previous: prev.total_revenue },
    totalImports: {
      current: curr.total_revenue - curr.total_profit,
      previous: prev.total_revenue - prev.total_profit,
    },
    totalRefund: { current: curr.total_refund, previous: prev.total_refund },
    monthlyProfit: { current: currentMonthlyProfit, previous: previousMonthlyProfit },
    monthlyTax: {
      current: taxFromRevenue(curr.total_revenue),
      previous: taxFromRevenue(prev.total_revenue),
    },
    availableProfit,
  };
};

const fetchDashboardStatsForDateRange = async ({ from, to }) => {
  const { p0, p1 } = computePreviousRange(from, to);
  const currentMonthKey = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;
  const monthStartDate = `${currentMonthKey}-01`;
  const [result, availableProfit, currentRangeWithdraw, previousRangeWithdraw] =
    await Promise.all([
    db.raw(buildRangeCompareStatsQuery(), [
      from,
      to,
      p0,
      p1,
    ]),
    fetchAvailableProfitPair({ currentMonthKey, monthStartDate }),
    sumWithdrawProfitBetweenDates({ from, to }),
    sumWithdrawProfitBetweenDates({ from: p0, to: p1 }),
  ]);
  const row = (result.rows && result.rows[0]) || {};

  const currRev = Number(row.net_revenue_curr || 0);
  const prevRev = Number(row.net_revenue_prev || 0);
  const currGrossProfit = Number(row.net_profit_curr || 0);
  const prevGrossProfit = Number(row.net_profit_prev || 0);
  const currProfit = currGrossProfit - currentRangeWithdraw;
  const prevProfit = prevGrossProfit - previousRangeWithdraw;

  return {
    totalOrders: {
      current: Number(row.total_orders_curr || 0),
      previous: Number(row.total_orders_prev || 0),
    },
    totalRevenue: { current: currRev, previous: prevRev },
    totalImports: {
      current: currRev - currGrossProfit,
      previous: prevRev - prevGrossProfit,
    },
    totalRefund: {
      current: Number(row.total_refund_curr || 0),
      previous: Number(row.total_refund_prev || 0),
    },
    monthlyProfit: { current: currProfit, previous: prevProfit },
    monthlyTax: {
      current: taxFromRevenueValue(currRev),
      previous: taxFromRevenueValue(prevRev),
    },
    availableProfit,
    range: { from, to, previousFrom: p0, previousTo: p1 },
  };
};

const fetchDashboardChartsForDateRange = async ({ from, to }) => {
  const result = await db.raw(buildRangeMonthlyChartQuery(), [from, to]);
  const rows = result.rows || [];
  const startYear = parseInt(String(from).slice(0, 4), 10);

  const months = rows.map((row) => {
    const revenue = Number(row.total_revenue) || 0;
    return {
      month: `T${row.month_num}/${row.year_num}`,
      month_num: Number(row.month_num),
      total_orders: Number(row.total_orders) || 0,
      total_canceled: Number(row.total_canceled) || 0,
      total_revenue: revenue,
      total_profit: Number(row.total_profit) || 0,
      total_refund: Number(row.total_refund) || 0,
      total_tax: taxFromRevenueValue(revenue),
    };
  });

  return {
    year: Number.isFinite(startYear) ? startYear : null,
    months,
    range: { from, to },
  };
};

const fetchDashboardYears = async () => {
  const result = await db.raw(buildYearsQuery());
  return (result.rows || []).map((row) => Number(row.year_value));
};

const fetchDashboardCharts = async ({ year, limitToToday }) => {
  const bindings = [year, year, year, !!limitToToday];
  const result = await db.raw(buildChartsQuery(), bindings);

  return {
    year,
    months: result.rows || [],
  };
};

const fetchDashboardMonthlySummary = async () => {
  const tableName_qualified = tableName(
    FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE,
    SCHEMA_FINANCE
  );
  
  const result = await db(tableName_qualified)
    .select('*')
    .orderBy(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS.MONTH_KEY, 'desc');
  
  return (result || []).map((row) => ({
    month_key: row.month_key || '',
    total_orders: Number(row.total_orders || 0),
    canceled_orders: Number(row.canceled_orders || 0),
    total_revenue: Number(row.total_revenue || 0),
    total_profit: Number(row.total_profit || 0),
    total_refund: Number(row.total_refund || 0),
    updated_at: row.updated_at || null,
  }));
};

const fetchDashboardChartsFromSummary = async ({ year, limitToToday }) => {
  const tableName_qualified = tableName(
    FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE,
    SCHEMA_FINANCE
  );
  const monthKeyCol = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS.MONTH_KEY;

  let query = db(tableName_qualified).select('*');
  
  // Filter by year: month_key is in format YYYY-MM
  const yearStr = String(year).padStart(4, '0');
  const yearPrefix = `${yearStr}-%`;
  query = query.where(monthKeyCol, 'like', yearPrefix);

  // If limiting to today, only include months up to current month of current year
  if (limitToToday && year === new Date().getFullYear()) {
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const currentYearMonth = `${yearStr}-${currentMonth}`;
    query = query.where(monthKeyCol, '<=', currentYearMonth);
  }

  const result = await query.orderBy(monthKeyCol, 'asc');

  // Build a map from existing rows
  const rowMap = new Map();
  for (const row of (result || [])) {
    const [, monthStr] = (row.month_key || '').split('-');
    const monthNum = parseInt(monthStr, 10);
    if (monthNum >= 1 && monthNum <= 12) {
      rowMap.set(monthNum, row);
    }
  }

  // Determine how many months to show
  const now = new Date();
  const maxMonth = (year === now.getFullYear()) ? (now.getMonth() + 1) : 12;

  // Fill all months from 1 to maxMonth, using 0 for missing months
  const months = [];
  for (let m = 1; m <= maxMonth; m++) {
    const row = rowMap.get(m);
    const revenue = row ? Number(row.total_revenue || 0) : 0;
    months.push({
      month: `T${m}`,
      month_num: m,
      month_key: `${yearStr}-${String(m).padStart(2, '0')}`,
      total_orders: row ? Number(row.total_orders || 0) : 0,
      total_canceled: row ? Number(row.canceled_orders || 0) : 0,
      total_revenue: revenue,
      total_profit: row ? Number(row.total_profit || 0) : 0,
      total_refund: row ? Number(row.total_refund || 0) : 0,
      total_tax: taxFromRevenueValue(revenue),
    });
  }

  return { year, months };
};

module.exports = {
  fetchDashboardStats,
  fetchDashboardStatsForDateRange,
  fetchDashboardYears,
  fetchDashboardCharts,
  fetchDashboardMonthlySummary,
  fetchDashboardChartsFromSummary,
  fetchDashboardChartsForDateRange,
};
