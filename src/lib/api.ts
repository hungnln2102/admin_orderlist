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
  return "http://localhost:3001";
})();

function normalizeBaseUrl(value: string): string {
  const v = (value || "").trim();
  if (!v) return "http://localhost:3001";
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
}
export interface YearsApiResponse {
  years: number[];
}

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
    throw new Error("Lỗi khi tải dữ liệu biểu đồ");
  }
  return response.json();
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
