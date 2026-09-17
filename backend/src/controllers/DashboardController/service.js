/**
 * Entry mạng cho Dashboard service.
 * Giữ nguyên API export cũ để controller/index không phải đổi import.
 */

const {
  fetchDashboardStats,
  fetchDashboardStatsForDateRange,
  clearDashboardStatsCache,
} = require("@/controllers/DashboardController/service/stats");
const {
  fetchDashboardChartsForDateRange,
  fetchDashboardChartsFromSummary,
} = require("@/controllers/DashboardController/service/charts");
const {
  fetchDashboardYears,
  fetchDashboardMonthlySummary,
} = require("@/controllers/DashboardController/service/summaryReads");

module.exports = {
  fetchDashboardStats,
  fetchDashboardStatsForDateRange,
  clearDashboardStatsCache,
  fetchDashboardYears,
  fetchDashboardMonthlySummary,
  fetchDashboardChartsFromSummary,
  fetchDashboardChartsForDateRange,
};
