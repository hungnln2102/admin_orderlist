export {
  API_BASE_URL,
  apiFetch,
  apiRequest,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
} from "../shared/api/client";
export {
  fetchAvailableYears,
  fetchChartData,
  fetchChartDataRange,
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
