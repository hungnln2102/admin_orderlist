const RAW_API_BASE: string = (() => {
  const metaBase =
    typeof import.meta !== "undefined"
      ? ((import.meta as any).env?.VITE_API_BASE_URL as string) || ""
      : "";
  if (metaBase) return metaBase;
  const envBase =
    typeof process !== "undefined"
      ? ((process as any).env?.VITE_API_BASE_URL as string) || ""
      : "";
  if (envBase) return envBase;
  // Dev: dùng "" → qua Vite proxy (same-origin), tránh lỗi localhost khác nhau giữa các máy
  const isDev =
    typeof import.meta !== "undefined" &&
    (import.meta as any).env?.DEV === true;
  if (isDev) return "";
  return "http://localhost:3001";
})();

function normalizeBaseUrl(value: string): string {
  const v = (value || "").trim();
  if (!v) return ""; // relative → Vite proxy
  if (/^:\\d+/.test(v)) return `http://localhost${v}`; // fix ":3001" -> http://localhost:3001
  if (/^localhost:\\d+/.test(v)) return `http://${v}`; // add protocol if missing
  if (!/^https?:\/\//i.test(v)) return `http://${v}`;
  return v;
}

export const API_BASE_URL: string = normalizeBaseUrl(RAW_API_BASE);

const buildUrl = (input: string): string => {
  if (input.startsWith("http")) return input;
  const base = API_BASE_URL.replace(/\/+$/, "");
  const path = input.replace(/^\/+/, "");
  return `${base}/${path}`;
};

export async function apiFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const url = buildUrl(input);
  const finalInit: RequestInit = {
    credentials: init?.credentials ?? "include",
    ...init,
  };
  try {
    return await fetch(url, finalInit);
  } catch (err) {
    if (!input.startsWith("http")) {
      try {
        return await fetch(`http://127.0.0.1:3001${input}`, finalInit);
      } catch {}
      try {
        return await fetch(input, finalInit);
      } catch {}
    }
    throw err as any;
  }
}

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
  year?: number;
}
export interface YearsApiResponse {
  years: number[];
}

type DashboardMonthRow = Partial<{
  month: string;
  month_label: string;
  month_num: number;
  total_orders: number;
  total_canceled: number;
  total_revenue: number;
  total_sales: number;
}>;

type DashboardChartsResponse = Partial<{
  months: DashboardMonthRow[];
  year: number;
}>;

/**
 * Lấy dữ liệu biểu đồ Doanh thu và Trạng thái đơn hàng.
 * @param year Năm cần lấy dữ liệu
 * @returns {ChartsApiResponse}
 */
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

  const revenueData: RevenueData[] = months.map((row) => ({
    month: normalizeMonthLabel(row),
    total_sales: Number(row.total_revenue ?? row.total_sales) || 0,
  }));

  const orderStatusData: OrderStatusData[] = months.map((row) => ({
    month: normalizeMonthLabel(row),
    total_orders: Number(row.total_orders) || 0,
    total_canceled: Number(row.total_canceled) || 0,
  }));

  return {
    revenueData,
    orderStatusData,
    year: Number.isFinite(payload.year) ? Number(payload.year) : undefined,
  };
}
/**
 * Lấy danh sách năm có dữ liệu trong database.
 */

export async function fetchAvailableYears(): Promise<number[]> {
  const response = await apiFetch("/api/dashboard/years");
  if (!response.ok) {
    throw new Error("Lỗi khi tải danh sách năm");
  }
  const data: YearsApiResponse = await response.json();
  if (!data || !Array.isArray(data.years)) {
    return [];
  }
  return data.years
    .map((year) => Number(year))
    .filter((year) => Number.isFinite(year));
}
