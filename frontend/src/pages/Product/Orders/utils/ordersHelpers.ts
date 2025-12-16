import { ORDER_FIELDS, ORDER_STATUSES, VIRTUAL_FIELDS, Order } from "../../../../constants";
import * as Helpers from "../../../../lib/helpers";

export const STATUS_DISPLAY_LABELS: Record<string, string> = {
  "hết hạn": ORDER_STATUSES.ORDER_EXPIRED,
  "cần gia hạn": ORDER_STATUSES.CAN_GIA_HAN,
  "chưa thanh toán": ORDER_STATUSES.CHUA_THANH_TOAN,
  "đã thanh toán": ORDER_STATUSES.DA_THANH_TOAN,
  "chưa hoàn": "Chưa Hoàn",
  "đã hoàn": "Đã Hoàn",
};

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

export const normalizeCheckFlag = (value: unknown): boolean | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (["true", "t", "1"].includes(lowered)) return true;
    if (["false", "f", "0"].includes(lowered)) return false;
  }
  return null;
};

export const normalizeStatusValue = (value: string): string => {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

export const isUnpaidNormalizedStatus = (normalizedStatus: string): boolean => {
  return (
    normalizedStatus === "chua thanh toan" ||
    normalizedStatus === "chua hoan" ||
    normalizedStatus.includes("chua thanh toan") ||
    normalizedStatus.includes("chua hoan")
  );
};

export const formatStatusDisplay = (value: string): string => {
  const normalized = normalizeStatusValue(value);
  if (normalized && STATUS_DISPLAY_LABELS[normalized]) {
    return STATUS_DISPLAY_LABELS[normalized];
  }
  return value;
};

export const parseExpiryTime = (order: Order): number => {
  const raw =
    sanitizeDateLike(order.expiry_date) ??
    sanitizeDateLike(order[ORDER_FIELDS.ORDER_EXPIRED]) ??
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
