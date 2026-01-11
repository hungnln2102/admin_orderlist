import { Supply } from "./types";

export const formatCurrency = (value: number | string) => {
  const num = Number(value) || 0;
  return num.toLocaleString("vi-VN") + " d";
};

export const normalizeDateLike = (
  value: unknown
): string | number | Date | null => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    value instanceof Date
  ) {
    return value;
  }
  return null;
};

export const getSupplyName = (s?: Supply | null) =>
  (s?.supplier_name ?? s?.source_name ?? s?.name ?? "").trim();
