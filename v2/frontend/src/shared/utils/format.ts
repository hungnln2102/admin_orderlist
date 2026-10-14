/**
 * format.ts
 * Bộ tiện ích định dạng tiền tệ, ngày tháng và thời lượng chuẩn hóa dùng chung toàn hệ thống V2.
 */

/**
 * Định dạng tiền tệ Việt Nam Đồng (VND)
 * Ví dụ: 125000 -> "125.000 ₫"
 */
export function formatCurrency(val?: number | string | null): string {
  if (val === null || val === undefined || val === "") return "0 ₫";
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
  if (isNaN(num)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN").format(Math.round(num)) + " ₫";
}

export const formatVND = formatCurrency;

/**
 * Định dạng số tiền không kèm ký hiệu tiền tệ
 * Ví dụ: 125000 -> "125.000"
 */
export function formatNumber(val?: number | string | null): string {
  if (val === null || val === undefined || val === "") return "0";
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("vi-VN").format(Math.round(num));
}

/**
 * Định dạng tiền tệ USDT
 * Ví dụ: 12.5 -> "12.50 USDT"
 */
export function formatUSDT(val?: number | string | null): string {
  if (val === null || val === undefined || val === "") return "0.00 USDT";
  const num = typeof val === "number" ? val : parseFloat(String(val));
  if (isNaN(num)) return "0.00 USDT";
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + " USDT";
}

/**
 * Định dạng ngày hiển thị dạng DD/MM/YYYY
 * Ví dụ: "2026-10-14T03:00:00Z" -> "14/10/2026"
 */
export function formatDateDisplay(dateStr?: string | Date | null): string {
  if (!dateStr) return "—";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export const formatDate = formatDateDisplay;

/**
 * Định dạng ngày chuẩn YYYY-MM-DD
 * Ví dụ: new Date() -> "2026-10-14"
 */
export function formatDateYYYYMMDD(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Định dạng thời lượng gói
 * Ví dụ: "12m" -> "12 tháng", "1y" -> "12 tháng", "30d" -> "30 ngày"
 */
export function formatDuration(raw?: string | null): string {
  if (!raw) return "";
  const match = String(raw).match(/^(\d+)([mMyYdD])$/i);
  if (!match) return String(raw);
  const num = match[1];
  const unit = match[2].toLowerCase();
  if (unit === "m") return `${num} tháng`;
  if (unit === "y") return `${Number(num) * 12} tháng`;
  if (unit === "d") return `${num} ngày`;
  return String(raw);
}
