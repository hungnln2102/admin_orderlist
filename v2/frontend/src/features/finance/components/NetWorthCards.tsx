import React from "react";
import { CreditCard, PieChart, TrendingUp, Wallet } from "lucide-react";
import { NetWorthMetrics } from "../types";

interface Props {
  metrics: NetWorthMetrics;
}

const formatVND = (value: number) => `${Math.round(value).toLocaleString("vi-VN")} ₫`;

export const NetWorthCards: React.FC<Props> = ({ metrics }) => {
  const breakdown = metrics.breakdown;
  const leverage = metrics.totalAssets > 0 ? Math.round((metrics.totalLiabilities / metrics.totalAssets) * 100) : 0;
  const items = [
    { label: "Tài sản ròng", value: formatVND(metrics.netWorth), detail: "Sau khi trừ nghĩa vụ", icon: TrendingUp, valueClass: metrics.netWorth >= 0 ? "text-emerald-300" : "text-rose-300" },
    { label: "Tổng tài sản", value: formatVND(metrics.totalAssets), detail: `Ví shop ${formatVND(breakdown.shopBalanceTotal)}`, icon: Wallet, valueClass: "text-slate-100" },
    { label: "Tổng nghĩa vụ", value: formatVND(metrics.totalLiabilities), detail: `Trả góp ${formatVND(breakdown.totalInstallmentsRemainingDebt)}`, icon: CreditCard, valueClass: "text-slate-100" },
    { label: "Tỷ lệ nghĩa vụ", value: `${leverage}%`, detail: "Trên tổng tài sản", icon: PieChart, valueClass: leverage > 70 ? "text-amber-200" : "text-slate-100" },
  ];

  return <section className="grid grid-cols-1 overflow-hidden rounded-2xl sm:grid-cols-2 lg:grid-cols-4 border border-slate-800 bg-[#0b1422]" aria-label="Tóm tắt tài sản và nghĩa vụ">{items.map(({ label, value, detail, icon: Icon, valueClass }, index) => <div key={label} className={`flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5 ${index > 0 ? "border-t border-slate-800 sm:border-l sm:border-t-0" : ""}`}><div className="flex min-w-0 items-center gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800/80 text-slate-400"><Icon className="h-4 w-4" /></div><div className="min-w-0"><div className="text-[11px] font-medium text-slate-500">{label}</div><div className={`mt-0.5 truncate font-mono text-sm font-semibold ${valueClass}`}>{value}</div></div></div><div className="hidden text-right text-[10px] text-slate-500 sm:block">{detail}</div></div>)}</section>;
};
