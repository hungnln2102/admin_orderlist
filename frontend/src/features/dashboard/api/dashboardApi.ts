import { apiFetch } from "@/shared/api/client";

export interface RevenueData {
  month: string;
  total_sales: number;
}

export interface OrderStatusData {
  month: string;
  total_orders: number;
  total_canceled: number;
}

export interface ProfitData {
  month: string;
  total_profit: number;
}

export interface RefundData {
  month: string;
  total_refund: number;
}

export interface TaxData {
  month: string;
  total_tax: number;
}

export interface ChartsApiResponse {
  revenueData: RevenueData[];
  orderStatusData: OrderStatusData[];
  profitData: ProfitData[];
  refundData: RefundData[];
  taxData: TaxData[];
  year?: number;
}

export interface MonthlySummaryData {
  month_key: string;
  total_orders: number;
  canceled_orders: number;
  total_revenue: number;
  total_profit: number;
  total_refund: number;
  updated_at: string | null;
}

export interface DashboardStatsResponse {
  totalOrders: { current: number; previous: number };
  totalRevenue: { current: number; previous: number };
  totalImports: { current: number; previous: number };
  totalRefund: { current: number; previous: number };
}

interface YearsApiResponse {
  years: number[];
}

interface MonthlySummaryApiResponse {
  months: MonthlySummaryData[];
}

type DashboardMonthRow = Partial<{
  month: string;
  month_label: string;
  month_num: number;
  total_orders: number;
  total_canceled: number;
  total_revenue: number;
  total_sales: number;
  total_profit: number;
  total_refund: number;
  total_tax: number;
}>;

type DashboardChartsResponse = Partial<{
  months: DashboardMonthRow[];
  year: number;
}>;

export async function fetchDashboardStats(): Promise<DashboardStatsResponse> {
  const response = await apiFetch("/api/dashboard/stats");
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "Không thể tải thống kê tổng quan.");
  }
  return response.json();
}

export async function fetchChartData(
  year: number = new Date().getFullYear()
): Promise<ChartsApiResponse> {
  const response = await apiFetch(`/api/dashboard/charts?year=${year}`);
  if (!response.ok) {
    throw new Error("Không thể tải dữ liệu biểu đồ dashboard.");
  }

  const payload: DashboardChartsResponse =
    (await response.json().catch(() => ({}))) || {};
  const months = Array.isArray(payload.months) ? payload.months : [];

  const normalizeMonthLabel = (row: DashboardMonthRow): string => {
    const label =
      row.month ||
      row.month_label ||
      (Number.isFinite(row.month_num) ? `T${row.month_num}` : "");
    return String(label || "").trim();
  };

  return {
    revenueData: months.map((row) => ({
      month: normalizeMonthLabel(row),
      total_sales: Number(row.total_revenue ?? row.total_sales) || 0,
    })),
    orderStatusData: months.map((row) => ({
      month: normalizeMonthLabel(row),
      total_orders: Number(row.total_orders) || 0,
      total_canceled: Number(row.total_canceled) || 0,
    })),
    profitData: months.map((row) => ({
      month: normalizeMonthLabel(row),
      total_profit: Number(row.total_profit) || 0,
    })),
    refundData: months.map((row) => ({
      month: normalizeMonthLabel(row),
      total_refund: Number(row.total_refund) || 0,
    })),
    taxData: months.map((row) => ({
      month: normalizeMonthLabel(row),
      total_tax: Number(row.total_tax) || 0,
    })),
    year: Number.isFinite(payload.year) ? Number(payload.year) : undefined,
  };
}

export async function fetchAvailableYears(): Promise<number[]> {
  const response = await apiFetch("/api/dashboard/years");
  if (!response.ok) {
    throw new Error("Lỗi khi tải danh sách năm");
  }

  const data: YearsApiResponse = await response.json();
  if (!data || !Array.isArray(data.years)) return [];

  return data.years
    .map((year) => Number(year))
    .filter((year) => Number.isFinite(year));
}

export async function fetchMonthlySummary(): Promise<MonthlySummaryData[]> {
  const response = await apiFetch("/api/dashboard/monthly-summary");
  if (!response.ok) {
    throw new Error("Không thể tải dữ liệu tóm tắt hàng tháng.");
  }

  const data: MonthlySummaryApiResponse = await response.json();
  if (!data || !Array.isArray(data.months)) return [];

  return data.months;
}
