import React from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatVND } from "@/shared/utils";
import { CreditCard, ShieldCheck, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import { NetWorthMetrics, BreakEvenMetrics } from "../types";

interface Props {
  metrics: NetWorthMetrics;
  breakEven: BreakEvenMetrics;
}

export const NetWorthCards: React.FC<Props> = ({ metrics, breakEven }) => {
  const breakdown = metrics.breakdown;
  const isNetPositive = metrics.netWorth >= 0;
  const isProfitPositive = breakEven.netProfit >= 0;

  return (
    <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Tóm tắt tài sản ròng và sức khỏe tài chính">
      {/* 1. Tài Sản Ròng */}
      <GlassCard
        glow={isNetPositive ? "emerald" : "rose"}
        className="group relative overflow-hidden !p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-black/90 backdrop-blur-3xl rounded-2xl flex flex-col justify-between"
      >
        <div className={`absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r ${isNetPositive ? "from-emerald-500 via-teal-400 to-cyan-500" : "from-rose-500 to-amber-500"} opacity-80 group-hover:opacity-100 transition-opacity`} />
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Tài Sản Ròng
            </span>
            <div className={`p-2 rounded-xl border backdrop-blur-2xl shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${isNetPositive ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/20" : "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-rose-500/20"}`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1.5">
            <div className={`text-2xl sm:text-[28px] font-black tracking-tight leading-none font-mono ${isNetPositive ? "text-emerald-300" : "text-rose-300"}`}>
              {formatVND(metrics.netWorth)}
            </div>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-[11px] font-medium text-slate-400">
            Tài khoản Shop - (Nợ + Chi phí)
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${isNetPositive ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30"}`}>
            {isNetPositive ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-rose-400" />}
            {isNetPositive ? "Thặng dư" : "Thâm hụt"}
          </span>
        </div>
      </GlassCard>

      {/* 2. Lợi Nhuận Ròng (Net Profit) */}
      <GlassCard
        glow={isProfitPositive ? "emerald" : "rose"}
        className="group relative overflow-hidden !p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-black/90 backdrop-blur-3xl rounded-2xl flex flex-col justify-between"
      >
        <div className={`absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r ${isProfitPositive ? "from-emerald-500 via-teal-400 to-cyan-500" : "from-rose-500 to-amber-500"} opacity-80 group-hover:opacity-100 transition-opacity`} />
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Lợi Nhuận Ròng (Net Profit)
            </span>
            <div className={`p-2 rounded-xl border backdrop-blur-2xl shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${isProfitPositive ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/20" : "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-rose-500/20"}`}>
              {isProfitPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="my-1.5">
            <div className={`text-2xl sm:text-[28px] font-black tracking-tight leading-none font-mono ${isProfitPositive ? "text-emerald-300" : "text-rose-300"}`}>
              {isProfitPositive ? "+" : ""}{formatVND(breakEven.netProfit)}
            </div>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-[11px] font-medium text-slate-400">
            {breakEven.isBreakEvenPassed ? "Đã vượt mốc hòa vốn" : "Chưa đạt điểm hòa vốn"}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${breakEven.isBreakEvenPassed ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30"}`}>
            {breakEven.isBreakEvenPassed ? <Zap className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-amber-400" />}
            {breakEven.isBreakEvenPassed ? "Sinh lãi" : `${Math.round(breakEven.breakEvenPercent)}%`}
          </span>
        </div>
      </GlassCard>

      {/* 3. Tổng Tài Sản Tích Lũy */}
      <GlassCard
        glow="cyan"
        className="group relative overflow-hidden !p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10 border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-black/90 backdrop-blur-3xl rounded-2xl flex flex-col justify-between"
      >
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-cyan-500 to-blue-500 opacity-80 group-hover:opacity-100 transition-opacity" />
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Tổng Tài Sản
            </span>
            <div className="p-2 rounded-xl border backdrop-blur-2xl shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 bg-sky-500/20 text-sky-400 border-sky-500/40 shadow-sky-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="text-2xl sm:text-[28px] font-black tracking-tight leading-none text-white font-mono">
              {formatVND(metrics.totalAssets)}
            </div>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400">
            Ví Shop + Tiết kiệm & tài khoản cá nhân
          </span>
        </div>
      </GlassCard>

      {/* 4. Tổng Nghĩa Vụ Nợ */}
      <GlassCard
        glow="rose"
        className="group relative overflow-hidden !p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-rose-500/10 border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-black/90 backdrop-blur-3xl rounded-2xl flex flex-col justify-between"
      >
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-rose-500 to-pink-500 opacity-80 group-hover:opacity-100 transition-opacity" />
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Tổng Nghĩa Vụ Nợ
            </span>
            <div className="p-2 rounded-xl border backdrop-blur-2xl shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-rose-500/20">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="text-2xl sm:text-[28px] font-black tracking-tight leading-none text-rose-300 font-mono">
              {formatVND(metrics.totalLiabilities)}
            </div>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400">
            Dư nợ trả góp + Nợ cá nhân phải trả
          </span>
        </div>
      </GlassCard>
    </section>
  );
};
