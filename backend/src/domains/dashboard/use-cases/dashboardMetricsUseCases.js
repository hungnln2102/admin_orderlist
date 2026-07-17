const dashboardMetricsRepository = require("@/domains/dashboard/repositories/dashboardMetricsRepository");

const fetchDashboardStats = () => dashboardMetricsRepository.fetchDashboardStats();

const fetchDashboardStatsForDateRange = ({ from, to }) =>
  dashboardMetricsRepository.fetchDashboardStatsForDateRange({ from, to });

const fetchDashboardYears = () => dashboardMetricsRepository.fetchDashboardYears();

const fetchDashboardMonthlySummary = () =>
  dashboardMetricsRepository.fetchDashboardMonthlySummary();

const fetchDashboardChartsFromSummary = ({ year, limitToToday }) =>
  dashboardMetricsRepository.fetchDashboardChartsFromSummary({ year, limitToToday });

const fetchDashboardChartsForDateRange = ({ from, to, chartBucket }) =>
  dashboardMetricsRepository.fetchDashboardChartsForDateRange({
    from,
    to,
    chartBucket,
  });

module.exports = {
  fetchDashboardStats,
  fetchDashboardStatsForDateRange,
  fetchDashboardYears,
  fetchDashboardMonthlySummary,
  fetchDashboardChartsFromSummary,
  fetchDashboardChartsForDateRange,
};
