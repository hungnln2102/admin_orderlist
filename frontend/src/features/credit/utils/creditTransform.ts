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

export const resolveCreditStatusText = (item: CreditLogItem): string => {
  const status = String(item.status || "").trim().toUpperCase();
  if (status === "REFUNDED") return "Hoàn tiền";
  if (status === "FULLY_APPLIED") return "Đã áp dụng";
  if (status === "VOID") return "Không khả dụng";
  if (status === "PARTIALLY_APPLIED") return "Khả dụng";
  if (status === "OPEN") return "Khả dụng";
  return resolveAvailabilityText(item);
};

export const resolveCreditStatusClass = (item: CreditLogItem): string => {
  const status = String(item.status || "").trim().toUpperCase();
  if (status === "REFUNDED") return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  if (status === "FULLY_APPLIED") return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
  if (status === "VOID") return "bg-rose-500/20 text-rose-300 border-rose-500/30";
  return resolveAvailabilityClass(item);
};
