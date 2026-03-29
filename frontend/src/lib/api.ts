export { API_BASE_URL, apiFetch } from "../shared/api/client";
export {
  fetchAvailableYears,
  fetchChartData,
  fetchDashboardStats,
  fetchMonthlySummary,
} from "../features/dashboard/api/dashboardApi";
export type {
  ChartsApiResponse,
  DashboardStatsResponse,
  MonthlySummaryData,
  OrderStatusData,
  ProfitData,
  RefundData,
  RevenueData,
} from "../features/dashboard/api/dashboardApi";
