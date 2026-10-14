import React from "react";
import { NetWorthMetrics } from "../types";
import { formatVND } from "@/shared/utils";
import { ShieldCheck, Wallet, CreditCard, PieChart } from "lucide-react";

interface Props {
  metrics: NetWorthMetrics;
}

export const NetWorthCards: React.FC<Props> = ({ metrics }) => {
  const bd = metrics.breakdown;
  const isPositive = metrics.netWorth >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Tài Sản Ròng (Net Worth) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/40 p-5 rounded-2xl border border-cyan-500/30 relative overflow-hidden shadow-xl shadow-cyan-950/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Tài Sản Ròng
          </span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-mono font-black text-white">
            {isPositive ? `+${formatVND(metrics.netWorth)}` : `-${formatVND(Math.abs(metrics.netWorth))}`}
          </div>
        </div>
      </div>

      {/* 2. Tổng Tài Sản & Tích Lũy */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Tổng Tài Sản & Tích Lũy
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-mono font-black text-emerald-300">
            {formatVND(metrics.totalAssets)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Ví Shop: {formatVND(bd.shopBalanceTotal)}</span>
            <span>Tiết kiệm: {formatVND(bd.personalSavingsTotal + bd.personalCashBankTotal)}</span>
          </div>
        </div>
      </div>

      {/* 3. Tổng Nợ Còn Lại */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
            Tổng Nợ & Trả Góp
          </span>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-mono font-black text-rose-300">
            {formatVND(metrics.totalLiabilities)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Dư nợ trả góp: {formatVND(bd.totalInstallmentsRemainingDebt)}</span>
            <span>Nợ NCC: {formatVND(bd.supplierDebtTotal)}</span>
          </div>
        </div>
      </div>

      {/* 4. Sức Khỏe Dòng Tiền */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
            Tỷ Lệ Nợ / Tài Sản
          </span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/20">
            <PieChart className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-mono font-black text-purple-300">
            {metrics.totalAssets > 0
              ? `${Math.round((metrics.totalLiabilities / metrics.totalAssets) * 100)}%`
              : "0%"}
          </div>
        </div>
      </div>
    </div>
  );
};
