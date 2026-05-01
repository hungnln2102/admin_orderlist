const { db } = require("../../db");
const {
  tableName,
  SCHEMA_FINANCE,
  FINANCE_SCHEMA,
} = require("../../config/dbSchema");
const { dashboardMonthlyTaxRatePercent } = require("../../config/appConfig");
const { fetchAvailableProfitPair } = require("./availableProfitFromSummary");

const summaryTableName = tableName(
  FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE,
  SCHEMA_FINANCE
);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

const MS_PER_DAY = 86400000;

/** `month_key` lịch hiện tại (clock server) — chỉ để chọn hàng đọc, không auto-seed. */
const currentCalendarMonthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

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

const monthKeysSpanned = (fromYmd, toYmd) => {
  const parseYm = (s) => {
    const p = String(s || "").trim().split("-");
    return { y: Number(p[0]), m: Number(p[1]) };
  };
  const a = parseYm(fromYmd);
  const b = parseYm(toYmd);
  if (!a.y || !a.m || !b.y || !b.m) return [];
  const keys = [];
  let y = a.y;
  let m = a.m;
  while (y < b.y || (y === b.y && m <= b.m)) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return keys;
};

const aggregateSummaryByMonthKeys = async (monthKeys) => {
  if (!monthKeys.length) return emptyMonthKpi();
  const rows = await db(summaryTableName)
    .whereIn(summaryCols.MONTH_KEY, monthKeys)
    .select(
      summaryCols.TOTAL_ORDERS,
      summaryCols.TOTAL_REVENUE,
      summaryCols.TOTAL_PROFIT,
      summaryCols.TOTAL_REFUND,
      summaryCols.TOTAL_IMPORT,
      summaryCols.TOTAL_TAX
    );
  return (rows || []).reduce(
    (acc, r) => ({
      total_orders: acc.total_orders + toNumber(r[summaryCols.TOTAL_ORDERS]),
      total_revenue: acc.total_revenue + toNumber(r[summaryCols.TOTAL_REVENUE]),
      total_profit: acc.total_profit + toNumber(r[summaryCols.TOTAL_PROFIT]),
      total_refund: acc.total_refund + toNumber(r[summaryCols.TOTAL_REFUND]),
      total_import: acc.total_import + toNumber(r[summaryCols.TOTAL_IMPORT]),
      total_tax: acc.total_tax + toNumber(r[summaryCols.TOTAL_TAX]),
    }),
    emptyMonthKpi()
  );
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
 * KPI một tháng: **chỉ** từ `dashboard_monthly_summary` (không CTE `order_list`).
 */
const kpiFromSummaryOnly = (monthKey, tableMap) => {
  const tr = tableMap.get(String(monthKey || "").trim());
  if (!tr) return emptyMonthKpi();
  return {
    total_orders: toNumber(tr[summaryCols.TOTAL_ORDERS]),
    total_revenue: toNumber(tr[summaryCols.TOTAL_REVENUE]),
    total_profit: toNumber(tr[summaryCols.TOTAL_PROFIT]),
    total_refund: toNumber(tr[summaryCols.TOTAL_REFUND]),
    total_import: toNumber(tr[summaryCols.TOTAL_IMPORT]),
    total_tax: toNumber(tr[summaryCols.TOTAL_TAX]),
  };
};

const fetchDashboardStats = async () => {
  const now = new Date();
  const currentMonthKey = currentCalendarMonthKey(now);
  const monthStartDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const [tableRows, availableProfit] = await Promise.all([
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
  const netC = revC - curr.total_refund;
  const netP = revP - prev.total_refund;
  const marginC = trC
    ? toNumber(trC[summaryCols.TOTAL_PROFIT])
    : netC - importC;
  const marginP = trP
    ? toNumber(trP[summaryCols.TOTAL_PROFIT])
    : netP - importP;
  const taxC = trC ? toNumber(trC[summaryCols.TOTAL_TAX]) : taxFromRevenueValue(netC);
  const taxP = trP ? toNumber(trP[summaryCols.TOTAL_TAX]) : taxFromRevenueValue(netP);

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
    availableProfit,
  };
};

const fetchDashboardStatsForDateRange = async ({ from, to }) => {
  const { p0, p1 } = computePreviousRange(from, to);
  const currentMonthKey = currentCalendarMonthKey();
  const monthStartDate = `${currentMonthKey}-01`;

  const currKeys = monthKeysSpanned(from, to);
  const prevKeys = monthKeysSpanned(p0, p1);

  const [currAgg, prevAgg, availableProfit] = await Promise.all([
    aggregateSummaryByMonthKeys(currKeys),
    aggregateSummaryByMonthKeys(prevKeys),
    fetchAvailableProfitPair({ currentMonthKey, monthStartDate }),
  ]);

  return {
    totalOrders: {
      current: currAgg.total_orders,
      previous: prevAgg.total_orders,
    },
    totalRevenue: {
      current: currAgg.total_revenue,
      previous: prevAgg.total_revenue,
    },
    totalImports: {
      current: currAgg.total_import,
      previous: prevAgg.total_import,
    },
    totalRefund: {
      current: currAgg.total_refund,
      previous: prevAgg.total_refund,
    },
    monthlyProfit: {
      current: currAgg.total_profit,
      previous: prevAgg.total_profit,
    },
    monthlyTax: {
      current: currAgg.total_tax,
      previous: prevAgg.total_tax,
    },
    availableProfit,
    range: { from, to, previousFrom: p0, previousTo: p1 },
  };
};

const fetchDashboardChartsForDateRange = async ({ from, to }) => {
  const monthKeys = monthKeysSpanned(from, to);
  const startYear = parseInt(String(from).slice(0, 4), 10);

  if (!monthKeys.length) {
    return {
      year: Number.isFinite(startYear) ? startYear : null,
      months: [],
      range: { from, to },
    };
  }

  const rows = await db(summaryTableName)
    .whereIn(summaryCols.MONTH_KEY, monthKeys)
    .select(
      summaryCols.MONTH_KEY,
      summaryCols.TOTAL_ORDERS,
      summaryCols.CANCELED_ORDERS,
      summaryCols.TOTAL_REVENUE,
      summaryCols.TOTAL_PROFIT,
      summaryCols.TOTAL_REFUND,
      summaryCols.TOTAL_IMPORT,
      summaryCols.TOTAL_TAX
    );
  const rowMap = new Map(
    (rows || []).map((r) => [String(r[summaryCols.MONTH_KEY] || "").trim(), r])
  );
  const months = monthKeys.map((mk) => {
    const r = rowMap.get(mk);
    const [ys, ms] = mk.split("-");
    const monthNum = parseInt(ms, 10);
    const yearNum = parseInt(ys, 10);
    const revenue = r ? toNumber(r[summaryCols.TOTAL_REVENUE]) : 0;
    const refund = r ? toNumber(r[summaryCols.TOTAL_REFUND]) : 0;
    const profitGross = r ? toNumber(r[summaryCols.TOTAL_PROFIT]) : 0;
    const taxStored = r ? toNumber(r[summaryCols.TOTAL_TAX]) : null;
    return {
      month: `T${monthNum}/${yearNum}`,
      month_num: monthNum,
      month_key: mk,
      total_orders: r ? toNumber(r[summaryCols.TOTAL_ORDERS]) : 0,
      total_canceled: r ? toNumber(r[summaryCols.CANCELED_ORDERS]) : 0,
      total_revenue: revenue,
      total_profit: profitGross,
      total_refund: refund,
      total_import: r ? toNumber(r[summaryCols.TOTAL_IMPORT]) : 0,
      total_tax:
        taxStored != null && Number.isFinite(taxStored)
          ? taxStored
          : taxFromRevenueValue(revenue - refund),
    };
  });

  return {
    year: Number.isFinite(startYear) ? startYear : null,
    months,
    range: { from, to },
  };
};

const fetchDashboardYears = async () => {
  const mk = summaryCols.MONTH_KEY;
  const r = await db.raw(
    `SELECT DISTINCT CAST(SUBSTRING(${mk}::text, 1, 4) AS INTEGER) AS year_value
     FROM ${summaryTableName}
     WHERE ${mk} IS NOT NULL AND LENGTH(TRIM(${mk}::text)) >= 4
     ORDER BY year_value DESC`
  );
  return (r.rows || [])
    .map((row) => Number(row.year_value))
    .filter((y) => Number.isFinite(y));
};

const fetchDashboardMonthlySummary = async () => {
  const dbRows = await db(summaryTableName)
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
      summaryCols.UPDATED_AT
    )
    .orderBy(summaryCols.MONTH_KEY, "desc");

  const monthKeys = (dbRows || [])
    .map((row) => String(row[summaryCols.MONTH_KEY] || "").trim())
    .filter(Boolean);
  return (dbRows || []).map((row) => {
    const mk = String(row[summaryCols.MONTH_KEY] || "").trim();
    return {
      month_key: mk,
      total_orders: toNumber(row[summaryCols.TOTAL_ORDERS]),
      canceled_orders: toNumber(row[summaryCols.CANCELED_ORDERS]),
      total_revenue: toNumber(row[summaryCols.TOTAL_REVENUE]),
      total_profit: toNumber(row[summaryCols.TOTAL_PROFIT]),
      total_refund: toNumber(row[summaryCols.TOTAL_REFUND]),
      total_import: toNumber(row[summaryCols.TOTAL_IMPORT]),
      total_tax: toNumber(row[summaryCols.TOTAL_TAX]),
      total_off_flow_bank_receipt: toNumber(row[summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT]),
      updated_at: row[summaryCols.UPDATED_AT] ?? null,
    };
  });
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
      summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT
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
      total_tax:
        taxStored != null && Number.isFinite(taxStored)
          ? taxStored
          : taxFromRevenueValue(revenue - refund),
    });
  }

  return { year, months };
};

module.exports = {
  fetchDashboardStats,
  fetchDashboardStatsForDateRange,
  fetchDashboardYears,
  fetchDashboardMonthlySummary,
  fetchDashboardChartsFromSummary,
  fetchDashboardChartsForDateRange,
};
