const { db } = require("../../db");
const {
  buildChartsQuery,
  buildYearsQuery,
  buildRangeCompareStatsQuery,
  buildRangeMonthlyChartQuery,
} = require("./queries");
const {
  buildDashboardSummaryAggregateQuery,
  buildGrossSalesByBirthDateRangeQuery,
} = require("./dashboardSummaryAggregate");
const {
  tableName,
  SCHEMA_FINANCE,
  FINANCE_SCHEMA,
  PARTNER_SCHEMA,
  SCHEMA_PARTNER,
} = require("../../config/dbSchema");
const { quoteIdent } = require("../../utils/sql");
const { dashboardMonthlyTaxRatePercent } = require("../../config/appConfig");
const { orderListHasCreatedAtColumn } = require("./orderListHasCreatedAtColumn");

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

const importLogTable = tableName(
  PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.TABLE,
  SCHEMA_PARTNER
);
const importLogCols = PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.COLS;

/** Ngày đầu / cuối lịch của tháng YYYY-MM (local). */
const ymdInclusiveRangeForMonthKey = (monthKey) => {
  const parts = String(monthKey || "").split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!y || !m || m < 1 || m > 12) return { from: null, to: null };
  const pad = (n) => String(n).padStart(2, "0");
  const from = `${y}-${pad(m)}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${y}-${pad(m)}-${pad(lastDay)}`;
  return { from, to };
};

const sumGrossSalesByBirthDateRange = async (from, to, useCreatedAt) => {
  if (!from || !to) return 0;
  const r = await db.raw(
    buildGrossSalesByBirthDateRangeQuery({ useCreatedAt }),
    [from, to]
  );
  return toNumber(r.rows?.[0]?.gross_sales);
};

/** Tổng import_cost theo log NCC (chỉ cộng cột import_cost, không lấy refund_amount). */
const sumImportCostByLoggedAtRange = async (from, to) => {
  if (!from || !to) return 0;
  const la = quoteIdent(importLogCols.LOGGED_AT);
  const ic = quoteIdent(importLogCols.IMPORT_COST);
  const r = await db.raw(
    `SELECT COALESCE(SUM(${ic}), 0) AS s FROM ${importLogTable} WHERE DATE(${la}) >= ?::date AND DATE(${la}) <= ?::date`,
    [from, to]
  );
  return toNumber(r.rows?.[0]?.s);
};

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
  const useCreatedAt = await orderListHasCreatedAtColumn();
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStartDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const { from: currFrom, to: currTo } = ymdInclusiveRangeForMonthKey(currentMonthKey);
  const { from: prevFrom, to: prevTo } = ymdInclusiveRangeForMonthKey(previousMonthKey);

  const [
    aggResult,
    availableProfit,
    monthlyWithdrawProfit,
    grossCurr,
    grossPrev,
  ] = await Promise.all([
    db.raw(
      buildDashboardSummaryAggregateQuery(summaryCols, { useCreatedAt })
    ),
    fetchAvailableProfitPair({ currentMonthKey, monthStartDate }),
    fetchMonthlyWithdrawProfitPair({ monthStartDate }),
    sumGrossSalesByBirthDateRange(currFrom, currTo, useCreatedAt),
    sumGrossSalesByBirthDateRange(prevFrom, prevTo, useCreatedAt),
  ]);

  const importRowByMonth = await db(summaryTableName)
    .select(summaryCols.MONTH_KEY, summaryCols.TOTAL_IMPORT)
    .whereIn(summaryCols.MONTH_KEY, [currentMonthKey, previousMonthKey]);
  const importKeyToVal = new Map(
    (importRowByMonth || []).map((r) => [
      String(r[summaryCols.MONTH_KEY] || ""),
      toNumber(r[summaryCols.TOTAL_IMPORT]),
    ])
  );
  const importCurr = importKeyToVal.get(currentMonthKey) || 0;
  const importPrev = importKeyToVal.get(previousMonthKey) || 0;

  const summaryRows = aggResult?.rows || [];
  const byMonth = new Map(
    summaryRows.map((r) => [String(r[summaryCols.MONTH_KEY] || ""), r])
  );
  const currentRow = byMonth.get(currentMonthKey) || {};
  const previousRow = byMonth.get(previousMonthKey) || {};

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

  // KPI: Doanh thu = tổng giá theo tháng đăng ký − hoàn (tháng hủy cùng kỳ); Nhập = total_import từ dashboard_monthly_summary (sync từ log NCC qua trigger/rebuild)
  const netRevenueCurr = grossCurr - curr.total_refund;
  const netRevenuePrev = grossPrev - prev.total_refund;
  const profitAfterCostCurr = netRevenueCurr - importCurr;
  const profitAfterCostPrev = netRevenuePrev - importPrev;
  const currentMonthlyProfit = profitAfterCostCurr - monthlyWithdrawProfit.current;
  const previousMonthlyProfit = profitAfterCostPrev - monthlyWithdrawProfit.previous;

  const taxFromRevenue = (revenue) => taxFromRevenueValue(revenue);

  return {
    totalOrders: { current: curr.total_orders, previous: prev.total_orders },
    totalRevenue: { current: netRevenueCurr, previous: netRevenuePrev },
    totalImports: {
      current: importCurr,
      previous: importPrev,
    },
    totalRefund: { current: curr.total_refund, previous: prev.total_refund },
    monthlyProfit: { current: currentMonthlyProfit, previous: previousMonthlyProfit },
    monthlyTax: {
      current: taxFromRevenue(netRevenueCurr),
      previous: taxFromRevenue(netRevenuePrev),
    },
    availableProfit,
  };
};

const fetchDashboardStatsForDateRange = async ({ from, to }) => {
  const useCreatedAt = await orderListHasCreatedAtColumn();
  const { p0, p1 } = computePreviousRange(from, to);
  const currentMonthKey = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;
  const monthStartDate = `${currentMonthKey}-01`;
  const [
    result,
    availableProfit,
    currentRangeWithdraw,
    previousRangeWithdraw,
    grossCurr,
    grossPrev,
    importCurr,
    importPrev,
  ] = await Promise.all([
    db.raw(buildRangeCompareStatsQuery({ useCreatedAt }), [from, to, p0, p1]),
    fetchAvailableProfitPair({ currentMonthKey, monthStartDate }),
    sumWithdrawProfitBetweenDates({ from, to }),
    sumWithdrawProfitBetweenDates({ from: p0, to: p1 }),
    sumGrossSalesByBirthDateRange(from, to, useCreatedAt),
    sumGrossSalesByBirthDateRange(p0, p1, useCreatedAt),
    sumImportCostByLoggedAtRange(from, to),
    sumImportCostByLoggedAtRange(p0, p1),
  ]);
  const row = (result.rows && result.rows[0]) || {};

  const refundCurr = Number(row.total_refund_curr || 0);
  const refundPrev = Number(row.total_refund_prev || 0);
  const netRevenueCurr = grossCurr - refundCurr;
  const netRevenuePrev = grossPrev - refundPrev;
  const profitAfterCostCurr = netRevenueCurr - importCurr;
  const profitAfterCostPrev = netRevenuePrev - importPrev;
  const currProfit = profitAfterCostCurr - currentRangeWithdraw;
  const prevProfit = profitAfterCostPrev - previousRangeWithdraw;

  return {
    totalOrders: {
      current: Number(row.total_orders_curr || 0),
      previous: Number(row.total_orders_prev || 0),
    },
    totalRevenue: { current: netRevenueCurr, previous: netRevenuePrev },
    totalImports: {
      current: importCurr,
      previous: importPrev,
    },
    totalRefund: {
      current: refundCurr,
      previous: refundPrev,
    },
    monthlyProfit: { current: currProfit, previous: prevProfit },
    monthlyTax: {
      current: taxFromRevenueValue(netRevenueCurr),
      previous: taxFromRevenueValue(netRevenuePrev),
    },
    availableProfit,
    range: { from, to, previousFrom: p0, previousTo: p1 },
  };
};

const fetchDashboardChartsForDateRange = async ({ from, to }) => {
  const useCreatedAt = await orderListHasCreatedAtColumn();
  const result = await db.raw(
    buildRangeMonthlyChartQuery({ useCreatedAt }),
    [from, to]
  );
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
  const useCreatedAt = await orderListHasCreatedAtColumn();
  const result = await db.raw(
    buildDashboardSummaryAggregateQuery(summaryCols, { useCreatedAt })
  );
  const rows = (result && result.rows) || [];
  const sorted = rows
    .slice()
    .sort((a, b) =>
      String(b[summaryCols.MONTH_KEY]).localeCompare(String(a[summaryCols.MONTH_KEY]))
    );
  const monthKeys = sorted
    .map((row) => String(row[summaryCols.MONTH_KEY] || "").trim())
    .filter(Boolean);
  let importMeta = new Map();
  if (monthKeys.length) {
    const stored = await db(summaryTableName)
      .select(
        summaryCols.MONTH_KEY,
        summaryCols.TOTAL_IMPORT,
        summaryCols.TOTAL_TAX,
        summaryCols.UPDATED_AT
      )
      .whereIn(summaryCols.MONTH_KEY, monthKeys);
    importMeta = new Map(
      (stored || []).map((r) => [
        String(r[summaryCols.MONTH_KEY] || ""),
        {
          total_import: toNumber(r[summaryCols.TOTAL_IMPORT]),
          total_tax: toNumber(r[summaryCols.TOTAL_TAX]),
          updated_at: r[summaryCols.UPDATED_AT] ?? null,
        },
      ])
    );
  }
  return sorted.map((row) => {
    const mk = String(row[summaryCols.MONTH_KEY] || "");
    const meta = importMeta.get(mk);
    const totalRevenue = Number(row[summaryCols.TOTAL_REVENUE] || 0);
    const total_tax = meta
      ? toNumber(meta.total_tax)
      : taxFromRevenueValue(totalRevenue);
    return {
      month_key: mk,
      total_orders: Number(row[summaryCols.TOTAL_ORDERS] || 0),
      canceled_orders: Number(row[summaryCols.CANCELED_ORDERS] || 0),
      total_revenue: totalRevenue,
      total_profit: Number(row[summaryCols.TOTAL_PROFIT] || 0),
      total_refund: Number(row[summaryCols.TOTAL_REFUND] || 0),
      total_import: meta ? meta.total_import : 0,
      total_tax,
      updated_at: meta ? meta.updated_at : null,
    };
  });
};

const fetchDashboardChartsFromSummary = async ({ year, limitToToday }) => {
  const useCreatedAt = await orderListHasCreatedAtColumn();
  const aggregateResult = await db.raw(
    buildDashboardSummaryAggregateQuery(summaryCols, { useCreatedAt })
  );
  const allRows = aggregateResult?.rows || [];

  const yearStr = String(year).padStart(4, "0");
  let yearRows = allRows.filter((row) => {
    const mk = String(row[summaryCols.MONTH_KEY] || "");
    return mk.length >= 4 && mk.startsWith(yearStr);
  });

  if (limitToToday && year === new Date().getFullYear()) {
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
    const currentYearMonth = `${yearStr}-${currentMonth}`;
    yearRows = yearRows.filter(
      (row) => String(row[summaryCols.MONTH_KEY] || "") <= currentYearMonth
    );
  }

  const monthKeysForImport = yearRows
    .map((row) => String(row[summaryCols.MONTH_KEY] || "").trim())
    .filter(Boolean);
  let importByMonth = new Map();
  let taxByMonth = new Map();
  if (monthKeysForImport.length) {
    const importRows = await db(summaryTableName)
      .select(
        summaryCols.MONTH_KEY,
        summaryCols.TOTAL_IMPORT,
        summaryCols.TOTAL_TAX
      )
      .whereIn(summaryCols.MONTH_KEY, monthKeysForImport);
    importByMonth = new Map(
      (importRows || []).map((r) => [
        String(r[summaryCols.MONTH_KEY] || ""),
        toNumber(r[summaryCols.TOTAL_IMPORT]),
      ])
    );
    taxByMonth = new Map(
      (importRows || []).map((r) => [
        String(r[summaryCols.MONTH_KEY] || ""),
        toNumber(r[summaryCols.TOTAL_TAX]),
      ])
    );
  }

  const rowMap = new Map();
  for (const row of yearRows) {
    const parts = String(row[summaryCols.MONTH_KEY] || "").split("-");
    const monthStr = parts[1];
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
    const mk = `${yearStr}-${String(m).padStart(2, "0")}`;
    const storedTax = taxByMonth.get(mk);
    const total_tax =
      storedTax != null && !Number.isNaN(storedTax)
        ? toNumber(storedTax)
        : taxFromRevenueValue(revenue);
    months.push({
      month: `T${m}`,
      month_num: m,
      month_key: mk,
      total_orders: row ? Number(row.total_orders || 0) : 0,
      total_canceled: row ? Number(row.canceled_orders || 0) : 0,
      total_revenue: revenue,
      total_profit: row ? Number(row.total_profit || 0) : 0,
      total_refund: row ? Number(row.total_refund || 0) : 0,
      total_import: importByMonth.get(mk) || 0,
      total_tax,
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
