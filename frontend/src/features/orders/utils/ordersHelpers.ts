import { ORDER_FIELDS, VIRTUAL_FIELDS, Order } from "@/constants";
import * as Helpers from "@/lib/helpers";


export const formatCurrency = (value: number | string) => {
  const roundedNum = Helpers.roundGiaBanValue(value);
  return roundedNum.toLocaleString("vi-VN") + " VND";
};

export const parseErrorResponse = async (
  response: Response
): Promise<string | null> => {
  try {
    const text = await response.text();
    if (!text) return null;
    try {
      const data = JSON.parse(text);
      if (data && typeof data === "object" && "error" in data) {
        return (data as { error?: string }).error || null;
      }
      if (typeof data === "string") return data;
    } catch {
      // ignore JSON parse error; fall back to raw text
    }
    return text;
  } catch {
    return null;
  }
};

export const normalizeSearchText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

export const normalizeOrderCode = (value: unknown): string =>
  normalizeSearchText(value).replace(/[^a-z0-9]/g, "");

export const formatOrderCodeShort = (
  value: unknown,
  headLength = 8,
  tailLength = 4
): string => {
  if (value === null || value === undefined) return "";

  const code = String(value).trim();
  if (!code) return "";

  const minLengthToShorten = headLength + tailLength + 1;
  if (code.length <= minLengthToShorten) return code;

  return `${code.slice(0, headLength)}...${code.slice(-tailLength)}`;
};

export const resolveDateDisplay = (
  displayValue: string | number | Date | null | undefined,
  fallbackValue: string | number | Date | null | undefined
): string => {
  const value = displayValue ?? fallbackValue;
  if (value === null || value === undefined) return "";
  return Helpers.formatDateToDMY(value) || String(value);
};

export const sanitizeDateLike = (
  value: unknown
): string | number | Date | null | undefined => {
  if (value === null || value === undefined) return value;
  if (typeof value === "boolean") return undefined;
  if (typeof value === "string" || typeof value === "number" || value instanceof Date) {
    return value as string | number | Date;
  }
  return undefined;
};

export const sanitizeNumberLike = (
  value: unknown
): number | string | null | undefined => {
  if (value === null || value === undefined) return value;
  if (typeof value === "boolean") return null;
  if (typeof value === "number" || typeof value === "string") return value;
  return null;
};

export const parseNumeric = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/** Quy đổi thời hạn gói trong slot (vd. 6 tháng, 6m, 6T) → số tháng. */
export const parseDurationMonthsFromSlot = (slot: string): number | null => {
  const s = String(slot || "").trim();
  if (!s) return null;
  const monthWord = s.match(/(\d{1,3})\s*(?:tháng|thang)\b/i);
  if (monthWord) {
    const n = Number(monthWord[1]);
    if (Number.isFinite(n) && n > 0 && n <= 120) return n;
  }
  const mUnit = s.match(/(?:^|[-–—\s(/]|#)(\d{1,2})\s*([mM])(?=\s|$|[)\]—\-])/);
  if (mUnit) {
    const n = Number(mUnit[1]);
    if (Number.isFinite(n) && n > 0 && n <= 120) return n;
  }
  const tUnit = s.match(/(?:^|[-–—\s(/]|#)(\d{1,2})\s*T\b/i);
  if (tUnit) {
    const n = Number(tUnit[1]);
    if (Number.isFinite(n) && n > 0 && n <= 120) return n;
  }
  return null;
};

const AVG_DAYS_PER_MONTH = 30;

/**
 * Tổng ngày của đơn để chia tỷ lệ Hoàn từ NCC:
 * ưu tiên `days` (tổng ngày đã lưu); không có thì quy đổi từ tháng trong slot (× 30).
 */
export const resolveTotalOrderDaysForProration = (
  order: Pick<Order, "days" | "slot">
): number => {
  const fromDays = Number(order[ORDER_FIELDS.DAYS]);
  if (Number.isFinite(fromDays) && fromDays > 0) return Math.round(fromDays);

  const months = parseDurationMonthsFromSlot(String(order[ORDER_FIELDS.SLOT] || ""));
  if (months !== null && months > 0) return Math.round(months * AVG_DAYS_PER_MONTH);

  return 0;
};

export const parseExpiryTime = (order: Order): number => {
  const raw =
    sanitizeDateLike(order.expiry_date) ??
    sanitizeDateLike(order[ORDER_FIELDS.EXPIRY_DATE]) ??
    sanitizeDateLike(order.expiry_date_display) ??
    sanitizeDateLike(order[VIRTUAL_FIELDS.EXPIRY_DATE_DISPLAY]);
  const formatted = Helpers.formatDateToDMY(raw) || String(raw || "");
  const parts = formatted.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts.map(Number);
    if (Number.isFinite(d) && Number.isFinite(m) && Number.isFinite(y)) {
      return new Date(y, m - 1, d).getTime();
    }
  }
  const fallback = new Date(String(raw || ""));
  return Number.isFinite(fallback.getTime()) ? fallback.getTime() : 0;
};
