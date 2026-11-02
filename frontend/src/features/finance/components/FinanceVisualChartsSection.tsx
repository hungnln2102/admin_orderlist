import React from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatVND } from "@/shared/utils";
import {
  PieChart,
  BarChart3,
  Target,
} from "lucide-react";
import { FinanceSummaryData } from "../types";

interface Props {
  data: FinanceSummaryData;
}

export const FinanceVisualChartsSection: React.FC<Props> = ({ data }) => {
  // 1. Dữ liệu phân bổ tài sản cho Donut Chart (100% Thuần Tài Sản SHOP)
  const totalAssets = data.netWorth.totalAssets || 0;
  const shopBankTotal = (data.shopBankAccounts || [])
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + (a.balance || 0), 0);
  const shopUsdtTotal = (data.usdtWallets || [])
    .filter((w) => w.isActive)
    .reduce((sum, w) => sum + (w.balance || 0), 0);

  const usdtPercent = totalAssets > 0 ? (shopUsdtTotal / totalAssets) * 100 : 0;
  const bankPercent = totalAssets > 0 ? (shopBankTotal / totalAssets) * 100 : 0;

  // Donut SVG circumference (radius 56 -> 2 * PI * 56 ≈ 351.85)
  const c = 351.85;
  const usdtDash = (c * usdtPercent) / 100;
  const bankDash = (c * bankPercent) / 100;

  // 2. Dữ liệu Thu - Chi cho Multi-Bar Chart
  const revenue = data.breakEven.shopRevenue || 0;
  const ordersCount = data.breakEven.shopOrdersCount || 0;
  const cogsAndImports = (data.breakEven.shopCogs || 0) + (data.breakEven.totalExternalImport || 0);
  const fixedCosts = data.breakEven.activeFixedCostsTotal || 0;
  const debtBurden = data.breakEven.monthlyDebtBurden || 0;
  const totalExpense = cogsAndImports + fixedCosts + debtBurden;

  const maxCompare = Math.max(revenue, totalExpense, 1);
  const revenueBarWidth = revenue > 0 ? Math.min(100, Math.max(5, (revenue / maxCompare) * 100)) : 0;
  const expenseBarWidth = totalExpense > 0 ? Math.min(100, Math.max(5, (totalExpense / maxCompare) * 100)) : 0;

  const cogsRatio = totalExpense > 0 ? (cogsAndImports / totalExpense) * 100 : 0;
  const fixedRatio = totalExpense > 0 ? (fixedCosts / totalExpense) * 100 : 0;
  const debtRatio = totalExpense > 0 ? (debtBurden / totalExpense) * 100 : 0;

  // 3. Dữ liệu Mục tiêu & Runway Sinh Tồn
  const savingGoals = data.savingGoals;
  const activeGoals = savingGoals?.activeGoals || [];
  const monthlyBurnRate = fixedCosts + debtBurden;
  const runwayMonths = monthlyBurnRate > 0 ? Math.floor(totalAssets / monthlyBurnRate) : 999;

  const isYearMode = Boolean(data.month && data.month.length === 4) || ((data.dailyBreakEven?.daysInMonth || 0) > 35);
  const periodLabel = isYearMode ? "Thực Tế Năm" : "Thực Tế Tháng";

  // Helper format triệu (Tr / M)
  const formatM = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${Math.round(num / 1e3)}k`;
    return `${num} ₫`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
      {/* BIỂU ĐỒ 1: CƠ CẤU PHÂN BỔ TÀI SẢN (4 cols) */}
      <div className="lg:col-span-4">
        <GlassCard
          glow="emerald"
          className="!p-5 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-[#081410]/90 border-slate-800/80 rounded-2xl flex flex-col justify-between h-full space-y-3"
        >
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-emerald-400" />
              Cơ Cấu Phân Bổ Tài Sản
            </h4>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">
              {formatM(totalAssets)}
            </span>
          </div>

          {/* Donut SVG */}
          <div className="flex items-center justify-center relative py-2">
            <svg viewBox="0 0 160 160" className="w-40 h-40">
              <circle cx="80" cy="80" r="56" fill="none" stroke="#1e293b" strokeWidth="18" />
              {usdtPercent > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r="56"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="18"
                  strokeDasharray={`${usdtDash} ${c - usdtDash}`}
                  strokeDashoffset="0"
                  transform="rotate(-90 80 80)"
                  className="transition-all duration-700"
                />
              )}
              {bankPercent > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r="56"
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="18"
                  strokeDasharray={`${bankDash} ${c - bankDash}`}
                  strokeDashoffset={-usdtDash}
                  transform="rotate(-90 80 80)"
                  className="transition-all duration-700"
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TÀI SẢN SHOP</span>
              <span className="text-lg font-black font-mono text-white mt-0.5">
                {formatM(totalAssets)}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-1.5 text-xs border-t border-slate-800/60 pt-2 font-mono">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300 font-sans">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Ví USDT Shop (Xoay vốn)
              </span>
              <span className="font-bold text-emerald-300">
                {usdtPercent.toFixed(1)}% ({formatM(shopUsdtTotal)})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300 font-sans">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Ngân hàng Shop
              </span>
              <span className="font-bold text-cyan-300">
                {bankPercent.toFixed(1)}% ({formatVND(shopBankTotal)})
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* BIỂU ĐỒ 2: SO SÁNH THU - CHI - LÃI (5 cols) */}
      <div className="lg:col-span-5">
        <GlassCard
          glow="cyan"
          className="!p-5 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-[#0c1424]/90 border-slate-800/80 rounded-2xl flex flex-col justify-between h-full space-y-3"
        >
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              So Sánh Thu – Chi – Lãi (Cashflow Bars)
            </h4>
            <span className="text-[10px] font-mono text-cyan-300 font-bold">{periodLabel}</span>
          </div>

          <div className="space-y-3 py-1">
            {/* Bar 1: Doanh Thu */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-emerald-400" /> Doanh Thu Bán Hàng ({ordersCount} đơn)
                </span>
                <span className="font-mono font-bold text-emerald-300">
                  +{formatVND(revenue)}
                </span>
              </div>
              <div className="w-full h-4 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 flex shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-lg transition-all duration-700"
                  style={{ width: `${revenueBarWidth}%` }}
                />
              </div>
            </div>

            {/* Bar 2: Tổng Chi Phí */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-rose-400" /> Tổng Chi Phí (Vốn + Định phí + Nợ)
                </span>
                <span className="font-mono font-bold text-rose-300">
                  -{formatVND(totalExpense)} {revenue > 0 && totalExpense <= revenue * 5 ? `(${Math.round((totalExpense / revenue) * 100)}% DT)` : ""}
                </span>
              </div>
              <div className="w-full h-4 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 flex shadow-inner">
                <div
                  className="h-full bg-rose-500 transition-all duration-700"
                  style={{ width: `${(expenseBarWidth * cogsRatio) / 100}%` }}
                  title={`Vốn: ${formatVND(cogsAndImports)}`}
                />
                <div
                  className="h-full bg-amber-500 transition-all duration-700"
                  style={{ width: `${(expenseBarWidth * fixedRatio) / 100}%` }}
                  title={`Định phí: ${formatVND(fixedCosts)}`}
                />
                <div
                  className="h-full bg-purple-500 transition-all duration-700"
                  style={{ width: `${(expenseBarWidth * debtRatio) / 100}%` }}
                  title={`Nợ: ${formatVND(debtBurden)}`}
                />
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-rose-500" /> Vốn: {formatM(cogsAndImports)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-amber-500" /> Định phí: {formatM(fixedCosts)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-purple-500" /> Nợ: {formatM(debtBurden)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Lợi nhuận ròng đút túi:</span>
            <span className={`font-mono font-bold ${
              data.breakEven.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}>
              {formatVND(data.breakEven.netProfit)} ({data.breakEven.netProfit >= 0 ? "Thặng dư" : "Sắp hòa vốn"})
            </span>
          </div>
        </GlassCard>
      </div>

      {/* BIỂU ĐỒ 3: THƯỚC ĐO MỤC TIÊU & RUNWAY (3 cols) */}
      <div className="lg:col-span-3">
        <GlassCard
          glow="amber"
          className="!p-5 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-[#141008]/90 border-slate-800/80 rounded-2xl flex flex-col justify-between h-full space-y-3"
        >
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-cyan-400" />
              Thước Đo Mục Tiêu
            </h4>
            <span className="text-[10px] font-mono text-cyan-300 font-bold">
              {activeGoals.length} Cột Mốc
            </span>
          </div>

          <div className="space-y-3 py-1">
            {activeGoals.slice(0, 2).map((goal) => {
              const percent = Math.min(100, Math.max(0, goal.progressPercent));
              return (
                <div key={goal.id} className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-cyan-300 font-bold truncate max-w-[120px]" title={goal.name}>
                      🎯 {goal.name}
                    </span>
                    <span className="font-mono text-cyan-300 font-bold">{Math.round(percent)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, percent)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                    Quỹ: {formatVND(data.savingGoals?.currentFund || 0)} / {formatVND(goal.targetAmount)}
                  </span>
                </div>
              );
            })}

            {activeGoals.length === 0 && (
              <div className="p-3 text-center text-slate-500 italic text-xs">
                Chưa có mục tiêu
              </div>
            )}
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
            <span>🛡️ Runway Sinh Tồn:</span>
            <strong className="font-mono text-emerald-300 font-bold">
              {runwayMonths > 120 ? "> 10 Năm" : `${runwayMonths} Tháng`}
            </strong>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
