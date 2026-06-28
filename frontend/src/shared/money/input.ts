import { toFiniteNumber } from "@/shared/number";

export const digitsOnly = (value: unknown): string =>
  String(value || "").replace(/[^\d]/g, "");

export const parseIntegerMoneyInput = (value: unknown): number => {
  const digits = digitsOnly(value);
  if (!digits) return 0;
  const amount = Number(digits);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
};

export const formatIntegerMoney = (value: number, locale = "vi-VN"): string => {
  const amount = toFiniteNumber(value);
  return Math.round(amount).toLocaleString(locale);
};

export const formatIntegerMoneyInput = (value: number, locale = "vi-VN"): string => {
  if (!value) return "";
  return formatIntegerMoney(value, locale);
};

export const formatIntegerMoneyDraft = (value: unknown, locale = "vi-VN"): string => {
  const digits = digitsOnly(value);
  if (!digits) return "";
  const amount = Number(digits);
  if (!Number.isFinite(amount)) return "";
  return amount.toLocaleString(locale);
};

export const parseSignedIntegerMoneyInput = (value: unknown): number => {
  const raw = String(value || "");
  const cleaned = raw.replace(/[^\d-]/g, "");
  const normalized = cleaned.startsWith("-")
    ? "-" + cleaned.slice(1).replace(/-/g, "")
    : cleaned.replace(/-/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
};

export const parseDecimalMoneyInput = (value: unknown, precision = 4): number => {
  const normalized = String(value || "").replace(/,/g, "").trim();
  if (!normalized) return 0;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return 0;
  const factor = 10 ** precision;
  return Math.round(amount * factor) / factor;
};

export const formatDecimalMoney = (
  value: number,
  locale = "en-US",
  minimumFractionDigits = 2,
  maximumFractionDigits = 4
): string => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0";
  return amount.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  });
};

export const formatDecimalMoneyInput = (value: number): string => {
  if (!value) return "";
  return formatDecimalMoney(value);
};

export const formatDecimalMoneyDraft = (value: unknown): string => {
  const cleaned = String(value || "").replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const amount = Number(cleaned);
  if (!Number.isFinite(amount)) return cleaned;
  return formatDecimalMoney(amount);
};
