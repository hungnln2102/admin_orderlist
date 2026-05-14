const { db } = require("../../../db");
const {
  tableName,
  SCHEMA_FINANCE,
  FINANCE_SCHEMA,
} = require("../../../config/dbSchema");
const { dashboardMonthlyTaxRatePercent } = require("../../../config/appConfig");

const summaryTableName = tableName(
  FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE,
  SCHEMA_FINANCE
);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;
const dailyRevCols = FINANCE_SCHEMA.DAILY_REVENUE_SUMMARY.COLS;

const MS_PER_DAY = 86400000;
const DASHBOARD_CHART_RANGE_DAY_MAX = 120;

const pad2 = (n) => String(n).padStart(2, "0");

const toYMDDate = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseYMDLocal = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const toNumber = (value) => Number(value || 0);

const taxFromRevenueValue = (revenue) =>
  Math.round((Number(revenue) || 0) * (dashboardMonthlyTaxRatePercent / 100));

const currentCalendarMonthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const inclusiveDaySpan = (fromStr, toStr) => {
  const from = parseYMDLocal(fromStr);
  const to = parseYMDLocal(toStr);
  return Math.round((to - from) / MS_PER_DAY) + 1;
};

const listIsoDaysInclusive = (fromStr, toStr) => {
  const out = [];
  const start = parseYMDLocal(fromStr);
  const end = parseYMDLocal(toStr);
  if (start > end) return out;
  for (let t = start.getTime(); t <= end.getTime(); t += MS_PER_DAY) {
    out.push(toYMDDate(new Date(t)));
  }
  return out;
};

const isFullCalendarMonth = (fromYmd, toYmd) => {
  if (!fromYmd || !toYmd || fromYmd > toYmd) return false;
  const pf = String(fromYmd).split("-").map(Number);
  const pt = String(toYmd).split("-").map(Number);
  if (pf.length !== 3 || pt.length !== 3) return false;
  const [fy, fm, fd] = pf;
  const [ty, tm, td] = pt;
  if (fy !== ty || fm !== tm || fd !== 1) return false;
  const lastDay = new Date(fy, fm, 0).getDate();
  return td === lastDay;
};

const formatChartDayLabel = (isoYmd) => {
  const s = String(isoYmd || "").slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}`;
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

const yearKeysSpanned = (fromYmd, toYmd) => {
  const y1 = parseInt(String(fromYmd).slice(0, 4), 10);
  const y2 = parseInt(String(toYmd).slice(0, 4), 10);
  if (!Number.isFinite(y1) || !Number.isFinite(y2) || y1 > y2) return [];
  const keys = [];
  for (let y = y1; y <= y2; y++) keys.push(String(y));
  return keys;
};

const emptyMonthKpi = () => ({
  total_orders: 0,
  total_revenue: 0,
  total_profit: 0,
  total_refund: 0,
  total_import: 0,
  total_tax: 0,
});

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

module.exports = {
  db,
  summaryTableName,
  summaryCols,
  dailyRevCols,
  DASHBOARD_CHART_RANGE_DAY_MAX,
  toNumber,
  taxFromRevenueValue,
  currentCalendarMonthKey,
  inclusiveDaySpan,
  listIsoDaysInclusive,
  isFullCalendarMonth,
  formatChartDayLabel,
  computePreviousRange,
  monthKeysSpanned,
  yearKeysSpanned,
  kpiFromSummaryOnly,
};
