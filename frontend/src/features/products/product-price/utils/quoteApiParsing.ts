import type { ApiPriceEntry } from "../types";
import { safeNumber } from "./quoteNormalize";

export const parseApiPriceEntry = (data: unknown): ApiPriceEntry => {
  const d = data as Record<string, unknown>;
  const customerPrice = safeNumber(d?.price);
  const resellPrice = safeNumber(d?.resellPrice);
  const promoPrice = safeNumber(d?.promoPrice);
  return {
    price: customerPrice || resellPrice || promoPrice || 0,
    promoPrice: promoPrice || 0,
    resellPrice: resellPrice || undefined,
  };
};

export const parseDurationFromSku = (
  value: string
): { months: number | null; days: number | null } => {
  if (!value) return { months: null, days: null };
  const match =
    value.match(/--\s*(\d+)\s*([md])\b/i) ||
    value.match(/(\d+)\s*([md])\b/i);
  if (!match || !match[1]) return { months: null, days: null };
  const num = Number(match[1]);
  if (!Number.isFinite(num)) return { months: null, days: null };
  const unit = (match[2] || "").toLowerCase();
  if (unit === "d") return { months: null, days: num };
  if (unit === "m") return { months: num, days: null };
  return { months: null, days: null };
};
