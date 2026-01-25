import { ORDER_STATUS } from "@shared/orderStatuses";
import { SUPPLY_COLS, SUPPLY_PRICE_COLS } from "./tableSql";

// Date format helpers
export const convertDMYToYMD = (dmyString: string): string => {
  if (!dmyString || dmyString.indexOf("/") === -1) return dmyString;
  const parts = dmyString.split("/");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dmyString;
};

export const getTodayDMY = (): string => {
  // Always compute "today" in Vietnam time (UTC+7) to avoid off-by-one errors
  // for users whose device timezone is behind Vietnam.
  const now = Date.now();
  const vnMs = now + 7 * 60 * 60 * 1000;
  const date = new Date(vnMs);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

export const calculateExpirationDate = (
  registerDateStr: string,
  days: number,
  forceDay?: number
): string => {
  if (!registerDateStr || days <= 0) return "N/A";
  const parts = registerDateStr.split("/");
  if (parts.length !== 3) return "N/A";
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days - 1);
  if (Number.isFinite(forceDay) && forceDay! >= 1 && forceDay! <= 31) {
    date.setDate(forceDay!);
  }
  const newDay = String(date.getDate()).padStart(2, "0");
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  const newYear = date.getFullYear();
  return `${newDay}/${newMonth}/${newYear}`;
};

export const addMonthsMinusOneDay = (
  startDMY: string,
  months: number,
  forceDay?: number
): string => {
  if (!startDMY || !Number.isFinite(months) || months <= 0) return startDMY;
  const [d, m, y] = startDMY.split("/").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + months);
  dt.setDate(dt.getDate() - 1);
  if (Number.isFinite(forceDay) && forceDay! >= 1 && forceDay! <= 31) {
    dt.setDate(forceDay!);
  }
  return `${String(dt.getDate()).padStart(2, "0")}/${String(
    dt.getMonth() + 1
  ).padStart(2, "0")}/${dt.getFullYear()}`;
};

export const inclusiveDaysBetween = (startDMY: string, endDMY: string): number => {
  const [sd, sm, sy] = startDMY.split("/").map(Number);
  const [ed, em, ey] = endDMY.split("/").map(Number);
  const s = new Date(sy, sm - 1, sd);
  const e = new Date(ey, em - 1, ed);
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.floor((e.getTime() - s.getTime()) / msPerDay);
  return diff + 1;
};

const pad2 = (value: number): string => String(value).padStart(2, "0");

const parseFlexibleDate = (
  value: string | number | Date | null | undefined
): Date | null => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const stringValue = String(value).trim();
  if (!stringValue) return null;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(stringValue)) {
    const [d, m, y] = stringValue.split("/").map(Number);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d);
  }

  const isoMatch = stringValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch.map(Number);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d);
  }

  const parsed = new Date(stringValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

export const formatDateToDMY = (
  value: string | number | Date | null | undefined
): string => {
  // Fast path: avoid timezone shifts by formatting Y-M-D strings lexically
  if (typeof value === "string") {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const [, y, mo, d] = m;
      return `${d}/${mo}/${y}`;
    }
    const m2 = value.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
    if (m2) {
      const [, y, mo, d] = m2;
      return `${d}/${mo}/${y}`;
    }
  }
  const date = parseFlexibleDate(value);
  if (!date) return "";
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const isRegisteredToday = (
  value: string | number | Date | null | undefined
): boolean => {
  const date = parseFlexibleDate(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date.getTime() === today.getTime();
};

export const daysUntilDate = (
  value: string | number | Date | null | undefined
): number | null => {
  const date = parseFlexibleDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((date.getTime() - today.getTime()) / msPerDay);
};

export const parseMonthsFromInfo = (info?: string): number => {
  if (!info) return 0;
  const m = info.match(/--(\d+)m/i);
  if (!m) return 0;
  const months = Number(m[1] || 0);
  return Number.isFinite(months) && months > 0 ? months : 0;
};

export const daysFromMonths = (months: number): number => {
  if (!Number.isFinite(months) || months <= 0) return 0;
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return years * 365 + remainder * 30;
};

const toFiniteNumber = (value: number | string): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const roundGiaBanValue = (value: number | string): number => {
  const numeric = toFiniteNumber(value);
  const divisor = 1000;
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric / divisor) * divisor;
};

// Currency helpers
export const formatCurrency = (value: number | string): string => {
  const rounded = roundGiaBanValue(value);
  return `${rounded.toLocaleString("vi-VN")} ₫`;
};

export const formatCurrencyPlain = (value: number): string => {
  const n = toFiniteNumber(value);
  return n > 0 ? n.toLocaleString("vi-VN") : "";
};

export const formatNumberOnTyping = (value: string): string => {
  const raw = value.replace(/[^\d]/g, "");
  if (!raw) return "";
  const num = parseInt(raw, 10);
  if (isNaN(num)) return "";
  return num.toLocaleString("vi-VN").replace(/,/g, ".");
};

export const formatDecimalOnTyping = (value: string): string => {
  // Allow digits and at most one dot or comma
  let raw = value.replace(/,/g, ".");
  raw = raw.replace(/[^\d.]/g, "");
  
  const parts = raw.split(".");
  if (parts.length > 2) {
    raw = parts[0] + "." + parts.slice(1).join("");
  }
  
  return raw;
};


export const formatCurrencyShort = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return "₫0";
  if (value >= 1_000_000_000) {
    return `₫${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `₫${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `₫${(value / 1_000).toFixed(1)}K`;
  }
  return `₫${Math.round(value).toLocaleString("vi-VN")}`;
};

export type SupplyLike = Partial<{
  [SUPPLY_COLS.id]: number;
  [SUPPLY_COLS.sourceName]: string;
  name: string;
}>;

export type SupplyPriceLike = Partial<{
  [SUPPLY_PRICE_COLS.sourceId]: number;
  [SUPPLY_PRICE_COLS.price]: number;
  [SUPPLY_COLS.sourceName]: string;
}>;

/**
 * Find import price (gia nhap) for a given supply name using the supplied price list.
 * Looks up by supply id first (via supplies list), then falls back to name matching.
 */
export const getImportPriceBySupplyName = (
  supplyName: string,
  supplyPrices: SupplyPriceLike[],
  supplies: SupplyLike[] = []
): number | undefined => {
  const targetName = supplyName || "";
  if (!targetName) return undefined;

  const supplyId =
    supplies.find(
      (s) =>
        (s[SUPPLY_COLS.sourceName] || s.name || "") === targetName
    )?.[SUPPLY_COLS.id] ?? null;

  if (supplyId !== null) {
    const priceById = supplyPrices.find(
      (p) => p[SUPPLY_PRICE_COLS.sourceId] === supplyId
    );
    const priceValue = priceById?.[SUPPLY_PRICE_COLS.price];
    if (Number.isFinite(priceValue)) {
      return Number(priceValue);
    }
  }

  const priceByName = supplyPrices.find(
    (p) =>
      (p[SUPPLY_COLS.sourceName] || "") === targetName
  );
  const priceValue = priceByName?.[SUPPLY_PRICE_COLS.price];
  return Number.isFinite(priceValue) ? Number(priceValue) : undefined;
};

// Misc helpers
export const generateRandomId = (length: number): string => {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
};

export const getStatusColor = (status: string): string => {
  return getStatusMeta(status).color;
};

export const getStatusPriority = (status: string): number => {
  return getStatusMeta(status).priority;
};

const ORDER_STATUS_META: Record<
  string,
  { color: string; priority: number }
> = {
  [ORDER_STATUS.EXPIRED]: { color: "bg-red-600 text-white", priority: 1 },
  [ORDER_STATUS.RENEWAL]: { color: "bg-orange-500 text-white", priority: 2 },
  [ORDER_STATUS.UNPAID]: { color: "bg-yellow-500 text-slate-900", priority: 3 },
  [ORDER_STATUS.PROCESSING]: { color: "bg-sky-500 text-white", priority: 4 },
  [ORDER_STATUS.PAID]: { color: "bg-green-600 text-white", priority: 5 },
  [ORDER_STATUS.PENDING_REFUND]: { color: "bg-rose-500 text-white", priority: 6 },
  [ORDER_STATUS.REFUNDED]: { color: "bg-slate-600 text-white", priority: 7 },
};

const getStatusMeta = (status: string) =>
  ORDER_STATUS_META[status?.trim()] || { color: "bg-slate-600 text-white", priority: 5 };

export interface SepayQrOptions {
  accountNumber: string;
  bankCode: string;
  amount?: number | null;
  description?: string;
}

export const buildSepayQrUrl = ({
  accountNumber,
  bankCode,
  amount,
  description,
}: SepayQrOptions): string => {
  const acc = (accountNumber || "").trim();
  const bank = (bankCode || "").trim();
  if (!acc || !bank) return "";

  const params = new URLSearchParams();
  params.set("acc", acc);
  params.set("bank", bank);

  const numericAmount = Number(amount);
  if (Number.isFinite(numericAmount) && numericAmount > 0) {
    params.set("amount", Math.round(numericAmount).toString());
  }

  const desc = (description || "").trim();
  if (desc) {
    params.set("des", desc);
  }

  return `https://qr.sepay.vn/img?${params.toString()}`;
};

/**
 * Read a fetch response once and try to parse JSON, but gracefully fall back to raw text.
 * Helps avoid "Unexpected token '<'" errors when servers return HTML error pages.
 */
export const readJsonOrText = async <T = unknown>(
  response: Response
): Promise<{ data: T | null; rawText: string; contentType: string }> => {
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  if (rawText) {
    try {
      const parsed = JSON.parse(rawText) as T;
      return { data: parsed, rawText, contentType };
    } catch {
      // Ignore JSON parse errors; caller can inspect rawText.
    }
  }

  return { data: null, rawText, contentType };
};
