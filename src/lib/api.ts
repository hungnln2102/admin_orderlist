export const API_BASE_URL: string =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_BASE_URL) ||
  (process.env.VITE_API_BASE_URL as string) ||
  "http://localhost:3001";

export async function apiFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const url = input.startsWith("http") ? input : `${API_BASE_URL}${input}`;
  return fetch(url, init);
}

// Äá»‹nh nghÄ©a kiá»ƒu dá»¯ liá»‡u cho Charts API
export interface RevenueData {
  month: string;
  total_sales: number;
}

export interface OrderStatusData {
  month: string;
  total_orders: number;
  total_canceled: number;
}

export interface ChartsApiResponse {
  revenueData: RevenueData[];
  orderStatusData: OrderStatusData[];
}
export interface YearsApiResponse {
  years: number[];
}


/**
 * Láº¥y dá»¯ liá»‡u biá»ƒu Ä‘á»“ Doanh thu vÃ  Tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng.
 * @param year NÄƒm cáº§n láº¥y dá»¯ liá»‡u
 * @returns {ChartsApiResponse}
 */
export async function fetchChartData(
  year: number = new Date().getFullYear()
): Promise<ChartsApiResponse> {
  const response = await apiFetch(`/api/dashboard/charts?year=${year}`);
  if (!response.ok) {
    throw new Error("Failed to fetch chart data");
  }
  return response.json();
}
/**
 * Lay danh sach nam co du lieu trong database.
 */

export async function fetchAvailableYears(): Promise<number[]> {
  const response = await apiFetch("/api/dashboard/years");
  if (!response.ok) {
    throw new Error("Failed to fetch available years");
  }
  const data: YearsApiResponse = await response.json();
  if (!data || !Array.isArray(data.years)) {
    return [];
  }
  return data.years
    .map((year) => Number(year))
    .filter((year) => Number.isFinite(year));
}








