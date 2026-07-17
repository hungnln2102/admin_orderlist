const {
  fetchDashboardStats: fetchDashboardStatsLegacy,
  fetchDashboardStatsForDateRange: fetchDashboardStatsForDateRangeLegacy,
  fetchDashboardYears: fetchDashboardYearsLegacy,
  fetchDashboardMonthlySummary: fetchDashboardMonthlySummaryLegacy,
  fetchDashboardChartsFromSummary: fetchDashboardChartsFromSummaryLegacy,
  fetchDashboardChartsForDateRange: fetchDashboardChartsForDateRangeLegacy,
} = require("@/controllers/DashboardController/service");

const fetchDashboardStats = () => fetchDashboardStatsLegacy();

const fetchDashboardStatsForDateRange = ({ from, to }) =>
  fetchDashboardStatsForDateRangeLegacy({ from, to });

const fetchDashboardYears = () => fetchDashboardYearsLegacy();

const fetchDashboardMonthlySummary = () => fetchDashboardMonthlySummaryLegacy();

const fetchDashboardChartsFromSummary = ({ year, limitToToday }) =>
  fetchDashboardChartsFromSummaryLegacy({ year, limitToToday });

const fetchDashboardChartsForDateRange = ({ from, to, chartBucket }) =>
  fetchDashboardChartsForDateRangeLegacy({ from, to, chartBucket });

module.exports = {
  fetchDashboardStats,
  fetchDashboardStatsForDateRange,
  fetchDashboardYears,
  fetchDashboardMonthlySummary,
  fetchDashboardChartsFromSummary,
  fetchDashboardChartsForDateRange,
};
