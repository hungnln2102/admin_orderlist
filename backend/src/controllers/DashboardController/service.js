const { db } = require("../../db");
const {
  buildChartsQuery,
  buildYearsQuery,
  buildRangeCompareStatsQuery,
  buildRangeMonthlyChartQuery,
} = require("./queries");
const { buildDashboardSummaryAggregateQuery } = require("./dashboardSummaryAggregate");
const {
  tableName,
  SCHEMA_FINANCE,
  FINANCE_SCHEMA,
  ORDERS_SCHEMA,
  PARTNER_SCHEMA,
  SCHEMA_PARTNER,
  SCHEMA_ORDERS,
  SCHEMA_RECEIPT,
} = require("../../config/dbSchema");
const { quoteIdent } = require("../../utils/sql");
const orderListTable = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
const orderListCols = ORDERS_SCHEMA.ORDER_LIST.COLS;
const { dashboardMonthlyTaxRatePercent } = require("../../config/appConfig");
const { orderListHasCreatedAtColumn } = require("./orderListHasCreatedAtColumn");
const {
  buildAlignedMonthlyRows,
  rowToApiShape,
} = require("./monthlySnapshot");

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
const paymentReceiptTable = tableName(
  ORDERS_SCHEMA.PAYMENT_RECEIPT.TABLE,
  SCHEMA_RECEIPT
);
const paymentReceiptCols = ORDERS_SCHEMA.PAYMENT_RECEIPT.COLS;

/** Tổng biên lai (Sepay) trong khoảng ngày [from, to] (inclusive). */
const sumPaymentReceiptsByDateRange = async (from, to) => {
  if (!from || !to) return 0;
  const cPaid = quoteIdent(paymentReceiptCols.PAID_DATE);
  const cAmt = quoteIdent(paymentReceiptCols.AMOUNT);
  const r = await db.raw(
    `SELECT COALESCE(SUM(pr.${cAmt}::numeric), 0) AS s
     FROM ${paymentReceiptTable} pr
     WHERE pr.${cPaid} IS NOT NULL
       AND pr.${cPaid}::date >= ?::date
       AND pr.${cPaid}::date <= ?::date`,
    [from, to]
  );
  return toNumber(r.rows?.[0]?.s);
};

/** Tổng import_cost theo log NCC theo khoảng `logged_at`. */
const sumImportCostByLoggedAtRange = async (from, to) => {
  if (!from || !to) return 0;
  const la = quoteIdent(importLogCols.LOGGED_AT);
  const ic = quoteIdent(importLogCols.IMPORT_COST);
  const r = await db.raw(
    `SELECT COALESCE(SUM(${ic}::numeric), 0) AS s
     FROM ${importLogTable}
     WHERE ${la} IS NOT NULL
       AND DATE(${la}) >= ?::date
       AND DATE(${la}) <= ?::date`,
    [from, to]
  );
  return toNumber(r.rows?.[0]?.s);
};

/** Cùng quy tắc tháng: mỗi order_list_id một dòng lãi (log mới nhất trong khoảng ngày). */
const sumNccOrderMarginByLoggedAtRange = async (from, to) => {
  if (!from || !to) return 0;
  const la = quoteIdent(importLogCols.LOGGED_AT);
  const lid = quoteIdent(importLogCols.ORDER_LIST_ID);
  const logId = quoteIdent(importLogCols.ID);
  const olId = quoteIdent(orderListCols.ID);
  const gsp = quoteIdent(orderListCols.GROSS_SELLING_PRICE);
  const price = quoteIdent(orderListCols.PRICE);
  const cost = quoteIdent(orderListCols.COST);
  const r = await db.raw(
    `SELECT COALESCE(SUM(m), 0) AS s
     FROM (
       SELECT DISTINCT ON (l.${lid})
         GREATEST(
           0,
           COALESCE(ol.${gsp}::numeric, ol.${price}::numeric, 0) - COALESCE(ol.${cost}::numeric, 0)
         ) AS m
       FROM ${importLogTable} l
       INNER JOIN ${orderListTable} ol ON ol.${olId} = l.${lid}
       WHERE l.${la} IS NOT NULL
         AND l.${la}::date >= ?::date
         AND l.${la}::date <= ?::date
       ORDER BY l.${lid}, l.${logId} DESC
     ) sub`,
    [from, to]
  );
  return toNumber(r.rows?.[0]?.s);
};

const emptyMonthKpi = () => ({
  total_orders: 0,
  total_revenue: 0,
  total_profit: 0,
  total_refund: 0,
  total_import: 0,
  total_tax: 0,
});

/**
 * Từ dashboard_monthly_summary (ưu tiên) hoặc CTE tổng hợp order_list: đếm đơn (mốc birth),
 * hoàn theo tháng canceled_at, nhập từ cột sync từ log NCC. Doanh thu thẻ KPI dùng biên lai Sepay, không dùng total_revenue ở đây.
 */
const kpiForMonth = (monthKey, tableMap, aggMap) => {
  const mk = String(monthKey || "").trim();
  const tr = tableMap.get(mk);
  if (tr) {
    return {
      total_orders: toNumber(tr[summaryCols.TOTAL_ORDERS]),
      total_revenue: toNumber(tr[summaryCols.TOTAL_REVENUE]),
      total_profit: toNumber(tr[summaryCols.TOTAL_PROFIT]),
      total_refund: toNumber(tr[summaryCols.TOTAL_REFUND]),
      total_import: toNumber(tr[summaryCols.TOTAL_IMPORT]),
      total_tax: toNumber(tr[summaryCols.TOTAL_TAX]),
    };
  }
  const ar = aggMap.get(mk);
  if (ar) {
    const rev = toNumber(ar[summaryCols.TOTAL_REVENUE]);
    return {
      total_orders: toNumber(ar[summaryCols.TOTAL_ORDERS]),
      total_revenue: rev,
      total_profit: toNumber(ar[summaryCols.TOTAL_PROFIT]),
      total_refund: toNumber(ar[summaryCols.TOTAL_REFUND]),
      total_import: 0,
      total_tax: taxFromRevenueValue(rev),
    };
  }
  return emptyMonthKpi();
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

  const [aggResult, tableRows, availableProfit] = await Promise.all([
    db.raw(
      buildDashboardSummaryAggregateQuery(summaryCols, { useCreatedAt })
    ),
    db(summaryTableName)
      .select(
        summaryCols.MONTH_KEY,
        summaryCols.TOTAL_ORDERS,
        summaryCols.TOTAL_REVENUE,
        summaryCols.TOTAL_PROFIT,
        summaryCols.TOTAL_REFUND,
        summaryCols.TOTAL_IMPORT,
        summaryCols.TOTAL_TAX
      )
      .whereIn(summaryCols.MONTH_KEY, [currentMonthKey, previousMonthKey]),
    fetchAvailableProfitPair({ currentMonthKey, monthStartDate }),
  ]);

  const aggMap = new Map(
    (aggResult?.rows || []).map((r) => [String(r[summaryCols.MONTH_KEY] || ""), r])
  );
  const tableMap = new Map(
    (tableRows || []).map((r) => [String(r[summaryCols.MONTH_KEY] || ""), r])
  );

  const curr = kpiForMonth(currentMonthKey, tableMap, aggMap);
  const prev = kpiForMonth(previousMonthKey, tableMap, aggMap);

  const trC = tableMap.get(currentMonthKey);
  const trP = tableMap.get(previousMonthKey);
  const revC = toNumber(trC?.[summaryCols.TOTAL_REVENUE]);
  const revP = toNumber(trP?.[summaryCols.TOTAL_REVENUE]);
  const importC = toNumber(trC?.[summaryCols.TOTAL_IMPORT]);
  const importP = toNumber(trP?.[summaryCols.TOTAL_IMPORT]);
  const netC = revC - curr.total_refund;
  const netP = revP - prev.total_refund;
  const marginC = trC
    ? toNumber(trC[summaryCols.TOTAL_PROFIT])
    : netC - importC;
  const marginP = trP
    ? toNumber(trP[summaryCols.TOTAL_PROFIT])
    : netP - importP;

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
      current: taxFromRevenueValue(netC),
      previous: taxFromRevenueValue(netP),
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
    sepayCurr,
    sepayPrev,
    importCurr,
    importPrev,
    nccMarginCurr,
    nccMarginPrev,
  ] = await Promise.all([
    db.raw(buildRangeCompareStatsQuery({ useCreatedAt }), [from, to, p0, p1]),
    fetchAvailableProfitPair({ currentMonthKey, monthStartDate }),
    sumPaymentReceiptsByDateRange(from, to),
    sumPaymentReceiptsByDateRange(p0, p1),
    sumImportCostByLoggedAtRange(from, to),
    sumImportCostByLoggedAtRange(p0, p1),
    sumNccOrderMarginByLoggedAtRange(from, to),
    sumNccOrderMarginByLoggedAtRange(p0, p1),
  ]);
  const row = (result.rows && result.rows[0]) || {};

  const refundCurr = toNumber(row.total_refund_curr);
  const refundPrev = toNumber(row.total_refund_prev);
  const netRcurr = sepayCurr - refundCurr;
  const netRprev = sepayPrev - refundPrev;

  return {
    totalOrders: {
      current: toNumber(row.total_orders_curr),
      previous: toNumber(row.total_orders_prev),
    },
    totalRevenue: { current: sepayCurr, previous: sepayPrev },
    totalImports: {
      current: importCurr,
      previous: importPrev,
    },
    totalRefund: {
      current: refundCurr,
      previous: refundPrev,
    },
    monthlyProfit: { current: nccMarginCurr, previous: nccMarginPrev },
    monthlyTax: {
      current: taxFromRevenueValue(netRcurr),
      previous: taxFromRevenueValue(netRprev),
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
  const dbRows = await buildAlignedMonthlyRows();
  const sorted = dbRows
    .slice()
    .sort((a, b) =>
      String(b[summaryCols.MONTH_KEY]).localeCompare(String(a[summaryCols.MONTH_KEY]))
    );
  const monthKeys = sorted
    .map((row) => String(row[summaryCols.MONTH_KEY] || "").trim())
    .filter(Boolean);
  let updatedMap = new Map();
  if (monthKeys.length) {
    const stored = await db(summaryTableName)
      .select(summaryCols.MONTH_KEY, summaryCols.UPDATED_AT)
      .whereIn(summaryCols.MONTH_KEY, monthKeys);
    updatedMap = new Map(
      (stored || []).map((r) => [String(r[summaryCols.MONTH_KEY] || ""), r[summaryCols.UPDATED_AT] ?? null])
    );
  }
  return sorted.map((row) => {
    const api = rowToApiShape(row);
    return {
      ...api,
      updated_at: updatedMap.get(api.month_key) ?? null,
    };
  });
};

const fetchDashboardChartsFromSummary = async ({ year, limitToToday }) => {
  const allAligned = await buildAlignedMonthlyRows();
  const yearStr = String(year).padStart(4, "0");
  let yearRows = allAligned.filter((row) => {
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

  const rowMap = new Map();
  for (const row of yearRows) {
    const parts = String(row[summaryCols.MONTH_KEY] || "").split("-");
    const monthStr = parts[1];
    const monthNum = parseInt(monthStr, 10);
    if (monthNum >= 1 && monthNum <= 12) {
      rowMap.set(monthNum, row);
    }
  }

  const now = new Date();
  const maxMonth = (year === now.getFullYear()) ? (now.getMonth() + 1) : 12;

  const months = [];
  for (let m = 1; m <= maxMonth; m++) {
    const row = rowMap.get(m);
    const api = row ? rowToApiShape(row) : null;
    const mk = `${yearStr}-${String(m).padStart(2, "0")}`;
    months.push({
      month: `T${m}`,
      month_num: m,
      month_key: mk,
      total_orders: api ? api.total_orders : 0,
      total_canceled: api ? api.canceled_orders : 0,
      total_revenue: api ? api.total_revenue : 0,
      total_profit: api ? api.total_profit : 0,
      total_refund: api ? api.total_refund : 0,
      total_import: api ? api.total_import : 0,
      total_tax: api ? api.total_tax : taxFromRevenueValue(0),
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
