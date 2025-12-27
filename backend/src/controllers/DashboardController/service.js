const { db } = require("../../db");
const Helpers = require("../../../helpers");
const {
  buildStatsBindings,
  buildStatsQuery,
  buildYearsQuery,
  buildChartsQuery,
} = require("./queries");

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

module.exports = {
  fetchDashboardStats,
  fetchDashboardYears,
  fetchDashboardCharts,
};
