/**
 * Barrel re-export cho mọi SQL query builder phục vụ dashboard summary.
 *
 * Đặt tên `Queries` (đọc) để phân biệt với `Order/finance/dashboardSummary.js` (write).
 * Mọi builder dùng chung constants/expressions ở `summaryQueries/constants.js`.
 *
 * Gộp doanh thu / lợi nhuận / hoàn từ order_list theo thời điểm phát sinh:
 *  - «sinh bản ghi / đơn» (đếm đơn, gross): birth_date = COALESCE(created_at, order_date)
 *  - Doanh thu & lợi nhuận: event_date = canceled_at (nếu hoàn) hoặc birth_date
 *  - Hoàn tiền: tháng canceled_at
 *
 * @see scripts/ops/rebuild-dashboard-monthly-summary.js (cùng công thức)
 */
const {
  buildDashboardSummaryAggregateQuery,
} = require("@/controllers/DashboardController/summaryQueries/summaryRebuild");
const {
  buildRangeCompareStatsQuery,
} = require("@/controllers/DashboardController/summaryQueries/rangeCompare");
const {
  buildRangeMonthlyChartQuery,
  buildRangeDailyChartQuery,
} = require("@/controllers/DashboardController/summaryQueries/rangeCharts");
const {
  buildGrossSalesByBirthDateRangeQuery,
} = require("@/controllers/DashboardController/summaryQueries/grossSales");
const {
  buildOrderCountBirthInRangeQuery,
  buildOrderCountsByBirthYmInRangeQuery,
  buildOrderCountsByBirthYearInRangeQuery,
} = require("@/controllers/DashboardController/summaryQueries/orderCounts");
const {
  buildCanceledCountsByCanceledYmInRangeQuery,
  buildCanceledCountsByCanceledYearInRangeQuery,
} = require("@/controllers/DashboardController/summaryQueries/canceledCounts");
const {
  orderCountedStatuses,
  revenueCountedStatuses,
} = require("@/controllers/DashboardController/summaryQueries/constants");

module.exports = {
  buildDashboardSummaryAggregateQuery,
  buildRangeCompareStatsQuery,
  buildRangeMonthlyChartQuery,
  buildRangeDailyChartQuery,
  buildGrossSalesByBirthDateRangeQuery,
  buildOrderCountBirthInRangeQuery,
  buildOrderCountsByBirthYmInRangeQuery,
  buildOrderCountsByBirthYearInRangeQuery,
  buildCanceledCountsByCanceledYmInRangeQuery,
  buildCanceledCountsByCanceledYearInRangeQuery,
  orderCountedStatuses,
  revenueCountedStatuses,
};
