import {
  ORDER_CODE_PREFIXES,
  ORDER_FIELDS,
  VIRTUAL_FIELDS,
  Order,
} from "@/constants";
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

/** Đơn quà tặng: mã bắt đầu bằng MAVT (ORDER_CODE_PREFIXES.GIFT). */
export const isGiftOrderCode = (orderCode: unknown): boolean => {
  const code = String(orderCode ?? "").trim().toUpperCase();
  const prefix = String(ORDER_CODE_PREFIXES.GIFT).toUpperCase();
  return code.startsWith(prefix);
};

/** Chuẩn hóa canceled_at để sort: mới nhất = timestamp lớn nhất; thiếu → đẩy xuống cuối. */
export const parseCanceledAtToMs = (value: unknown): number => {
  if (value === null || value === undefined) return Number.NEGATIVE_INFINITY;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
  }
  const s = String(value).trim();
  if (!s) return Number.NEGATIVE_INFINITY;
  const fromIso = Date.parse(s);
  if (Number.isFinite(fromIso)) return fromIso;
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const t = Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
  }
  return Number.NEGATIVE_INFINITY;
};

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

const DMY_DISPLAY_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const dmyDisplayToLocalStartMs = (dmy: string): number | null => {
  const m = String(dmy).trim().match(DMY_DISPLAY_RE);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return null;
  }
  dt.setHours(0, 0, 0, 0);
  return dt.getTime();
};

const ymdIsoToLocalStartMs = (ymd: string): number | null => {
  const t = String(ymd).trim();
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return null;
  }
  dt.setHours(0, 0, 0, 0);
  return dt.getTime();
};

/** Đầu ngày đăng ký / cuối ngày hết hạn (local), sau enrich; thiếu ngày hiển thị thì đọc từ cột gốc. */
export const getOrderDurationDayBoundsMs = (
  order: Order
): { startMs: number; endMs: number } | null => {
  let reg = String(order[VIRTUAL_FIELDS.ORDER_DATE_DISPLAY] ?? "").trim();
  let exp = String(order[VIRTUAL_FIELDS.EXPIRY_DATE_DISPLAY] ?? "").trim();
  if (!reg) {
    const raw = sanitizeDateLike(
      order.registration_date ?? order[ORDER_FIELDS.ORDER_DATE]
    );
    reg = Helpers.formatDateToDMY(raw) || "";
  }
  if (!exp) {
    const raw = sanitizeDateLike(order.expiry_date ?? order[ORDER_FIELDS.EXPIRY_DATE]);
    exp = Helpers.formatDateToDMY(raw) || "";
  }
  const startMs = dmyDisplayToLocalStartMs(reg);
  if (startMs === null) return null;
  const endParsed = exp ? dmyDisplayToLocalStartMs(exp) : null;
  const endMs = endParsed !== null ? Math.max(startMs, endParsed) : startMs;
  return { startMs, endMs };
};

/** Khoảng lọc yyyy-mm-dd; giữ đơn nếu [đăng ký, hết hạn] giao với [from, to] (gồm cả biên). */
export const orderDurationOverlapsIsoRange = (
  order: Order,
  fromYmd: string,
  toYmd: string
): boolean => {
  const bounds = getOrderDurationDayBoundsMs(order);
  if (!bounds) return false;
  const filterStart = ymdIsoToLocalStartMs(fromYmd);
  const filterEnd = ymdIsoToLocalStartMs(toYmd);
  if (filterStart === null || filterEnd === null) return false;
  return bounds.startMs <= filterEnd && bounds.endMs >= filterStart;
};
