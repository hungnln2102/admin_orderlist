/**
 * Entry m?ng cho Dashboard service.
 * Gi? nguy�n API export cu d? controller/index kh�ng ph?i d?i import.
 */

const {
  fetchDashboardStats,
  fetchDashboardStatsForDateRange,
} = require("./service/stats");
const {
  fetchDashboardChartsForDateRange,
  fetchDashboardChartsFromSummary,
} = require("./service/charts");
const {
  fetchDashboardYears,
  fetchDashboardMonthlySummary,
} = require("./service/summaryReads");

module.exports = {
  fetchDashboardStats,
  fetchDashboardStatsForDateRange,
  fetchDashboardYears,
  fetchDashboardMonthlySummary,
  fetchDashboardChartsFromSummary,
  fetchDashboardChartsForDateRange,
};
