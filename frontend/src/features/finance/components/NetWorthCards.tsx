import React from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatVND } from "@/shared/utils";
import { NetWorthMetrics, BreakEvenMetrics } from "../types";

interface Props {
  metrics: NetWorthMetrics;
  breakEven: BreakEvenMetrics;
}

export const NetWorthCards: React.FC<Props> = ({ metrics, breakEven }) => {
  const isNetPositive = metrics.netWorth >= 0;
  const isProfitPositive = breakEven.netProfit >= 0;
  const debtRatio = metrics.totalAssets > 0 
    ? ((metrics.totalLiabilities / metrics.totalAssets) * 100).toFixed(2)
    : "0.00";

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Tóm tắt tài sản ròng và sức khỏe tài chính">
      {/* 1. Tài Sản Ròng */}
      <GlassCard
        glow={isNetPositive ? "emerald" : "rose"}
        className="group relative overflow-hidden !p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-black/90 backdrop-blur-3xl rounded-2xl flex flex-col justify-between"
      >
        <div className={`absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r ${isNetPositive ? "from-emerald-500 via-teal-400 to-cyan-500" : "from-rose-500 to-amber-500"} opacity-80 group-hover:opacity-100 transition-opacity`} />
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Tài Sản Ròng (Shop)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {isNetPositive ? "Thặng dư" : "Âm vốn"}
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-300 tracking-tight my-1">
            {formatVND(metrics.netWorth)}
          </div>
        </div>

        {/* Mini Sparkline Chart */}
        <div className="h-8 w-full mt-1.5 opacity-85 group-hover:opacity-100 transition-opacity">
          <svg viewBox="0 0 120 28" className="w-full h-full overflow-visible">
            <path d="M 0 24 Q 30 19, 60 14 T 120 4" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 0 24 Q 30 19, 60 14 T 120 4 L 120 28 L 0 28 Z" fill="rgba(16, 185, 129, 0.15)" />
          </svg>
        </div>
      </GlassCard>

      {/* 2. Lợi Nhuận Ròng (Net Profit) */}
      <GlassCard
        glow={isProfitPositive ? "emerald" : "rose"}
        className="group relative overflow-hidden !p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-rose-500/10 border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-black/90 backdrop-blur-3xl rounded-2xl flex flex-col justify-between"
      >
        <div className={`absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r ${isProfitPositive ? "from-emerald-500 via-teal-400 to-cyan-500" : "from-rose-500 to-amber-500"} opacity-80 group-hover:opacity-100 transition-opacity`} />
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Lợi Nhuận Ròng (Net Profit)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {Math.round(breakEven.breakEvenPercent)}%
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-rose-300 tracking-tight my-1">
            {formatVND(breakEven.netProfit)}
          </div>
        </div>

        {/* Mini Sparkline Chart */}
        <div className="h-8 w-full mt-1.5 opacity-85 group-hover:opacity-100 transition-opacity">
          <svg viewBox="0 0 120 28" className="w-full h-full overflow-visible">
            <path d="M 0 8 Q 40 12, 80 18 T 120 24" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 0 8 Q 40 12, 80 18 T 120 24 L 120 28 L 0 28 Z" fill="rgba(244, 63, 94, 0.15)" />
          </svg>
        </div>
      </GlassCard>

      {/* 3. Tổng Tài Sản Tích Lũy */}
      <GlassCard
        glow="cyan"
        className="group relative overflow-hidden !p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10 border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-black/90 backdrop-blur-3xl rounded-2xl flex flex-col justify-between"
      >
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-cyan-500 to-blue-500 opacity-80 group-hover:opacity-100 transition-opacity" />
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Tổng Tài Sản Shop
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Khả dụng
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-white tracking-tight my-1">
            {formatVND(metrics.totalAssets)}
          </div>
        </div>

        {/* Mini Sparkline Chart */}
        <div className="h-8 w-full mt-1.5 opacity-85 group-hover:opacity-100 transition-opacity">
          <svg viewBox="0 0 120 28" className="w-full h-full overflow-visible">
            <path d="M 0 20 Q 30 16, 70 10 T 120 4" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 0 20 Q 30 16, 70 10 T 120 4 L 120 28 L 0 28 Z" fill="rgba(34, 211, 238, 0.15)" />
          </svg>
        </div>
      </GlassCard>

      {/* 4. Tổng Nghĩa Vụ Nợ */}
      <GlassCard
        glow="rose"
        className="group relative overflow-hidden !p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-rose-500/10 border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-black/90 backdrop-blur-3xl rounded-2xl flex flex-col justify-between"
      >
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-rose-500 to-pink-500 opacity-80 group-hover:opacity-100 transition-opacity" />
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Tổng Nghĩa Vụ Nợ Shop
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              An toàn ({debtRatio}%)
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-rose-300 tracking-tight my-1">
            {formatVND(metrics.totalLiabilities)}
          </div>
        </div>

        {/* Mini Sparkline Chart */}
        <div className="h-8 w-full mt-1.5 opacity-85 group-hover:opacity-100 transition-opacity">
          <svg viewBox="0 0 120 28" className="w-full h-full overflow-visible">
            <path d="M 0 8 Q 40 14, 80 20 T 120 26" fill="none" stroke="#fb7185" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
          </svg>
        </div>
      </GlassCard>
    </section>
  );
};
