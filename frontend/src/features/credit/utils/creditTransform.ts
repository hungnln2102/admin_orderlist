import type { CreditLogItem } from "../types";

export const formatMoneyVnd = (value: number): string => {
  if (!Number.isFinite(value)) return "0 VND";
  return `${Math.round(value).toLocaleString("vi-VN")} VND`;
};

export const formatDateTime = (value: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN");
};

export const resolveAvailabilityText = (item: CreditLogItem): string => {
  if (item.is_unavailable) return "Không khả dụng";
  if (item.is_available) return "Khả dụng";
  return "Theo dõi";
};

export const resolveAvailabilityClass = (item: CreditLogItem): string => {
  if (item.is_unavailable) {
    return "bg-rose-500/20 text-rose-300 border-rose-500/30";
  }
  if (item.is_available) {
    return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  }
  return "bg-slate-500/20 text-slate-300 border-slate-500/30";
};
