const { db } = require("../../db");
const Helpers = require("../../../helpers");
const {
  buildStatsBindings,
  buildStatsQuery,
  buildYearsQuery,
  buildChartsQuery,
} = require("./queries");
const { tableName, SCHEMA_FINANCE, FINANCE_SCHEMA } = require("../../config/dbSchema");

const fetchDashboardStats = async () => {
  const periods = Helpers.calculatePeriods();
  const bindings = buildStatsBindings(periods);
  const result = await db.raw(buildStatsQuery(), bindings);
  const data = (result.rows && result.rows[0]) || {};

  return {
    totalOrders: {
      current: Number(data.total_orders_current || 0),
      previous: Number(data.total_orders_previous || 0),
    },
    totalImports: {
      current: Number(data.total_imports_current || 0),
      previous: Number(data.total_imports_previous || 0),
    },
    totalProfit: {
      current: Number(data.total_profit_current || 0),
      previous: Number(data.total_profit_previous || 0),
    },
    overdueOrders: {
      count: Number(data.overdue_orders_count || 0),
    },
    periods,
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
    months.push({
      month: `T${m}`,
      month_num: m,
      month_key: `${yearStr}-${String(m).padStart(2, '0')}`,
      total_orders: row ? Number(row.total_orders || 0) : 0,
      total_canceled: row ? Number(row.canceled_orders || 0) : 0,
      total_revenue: row ? Number(row.total_revenue || 0) : 0,
      total_profit: row ? Number(row.total_profit || 0) : 0,
      total_refund: row ? Number(row.total_refund || 0) : 0,
    });
  }

  return { year, months };
};

module.exports = {
  fetchDashboardStats,
  fetchDashboardYears,
  fetchDashboardCharts,
  fetchDashboardMonthlySummary,
  fetchDashboardChartsFromSummary,
};
