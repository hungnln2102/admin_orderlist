/**
 * Entry mạng cho Dashboard service.
 * Giữ nguyên API export cũ để controller/index không phải đổi import.
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
