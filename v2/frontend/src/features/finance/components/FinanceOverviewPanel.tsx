import React, { useMemo, useState } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatVND } from "@/shared/utils";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Flame,
  Info,
  PackageCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { BreakEvenMetrics, DailyBreakEvenPoint, DailyBreakEvenStats, NetWorthMetrics } from "../types";

interface Props {
  breakEven: BreakEvenMetrics;
  dailyBreakEven: DailyBreakEvenStats;
  netWorth: NetWorthMetrics;
  month: string;
}

export const FinanceOverviewPanel: React.FC<Props> = ({
  breakEven,
  dailyBreakEven,
  month,
}) => {
  const currentDay = dailyBreakEven.currentDay || Math.min(dailyBreakEven.daysInMonth, new Date().getDate());
  
  // Find today's data point
  const todayPoint = dailyBreakEven.chartData.find((item) => item.day === currentDay) || {
    day: currentDay,
    dateStr: `${month}-${String(currentDay).padStart(2, "0")}`,
    ordersCount: 0,
    dailyRevenue: 0,
    dailyCost: 0,
    todayProfit: dailyBreakEven.todayProfit,
    todayRequired: dailyBreakEven.requiredForToday,
    rollingBalance: dailyBreakEven.currentRollingBalance,
    isDebtFreeToday: dailyBreakEven.todayProfit >= dailyBreakEven.requiredForToday,
    isFuture: false,
    cumulativeProfit: breakEven.shopGrossProfit,
    cumulativeDeficit: 0,
    isMasterBreakEvenPassed: breakEven.isBreakEvenPassed,
    dailyQuota: dailyBreakEven.dailyBurden,
    previousDebt: dailyBreakEven.carriedDebtIntoToday,
  };

  const [selectedDay, setSelectedDay] = useState<DailyBreakEvenPoint | null>(() => todayPoint as DailyBreakEvenPoint);

  // Month label format: Tháng 10/2026
  const monthLabel = useMemo(() => {
    try {
      const [year, m] = month.split("-");
      return `Tháng ${m}/${year}`;
    } catch {
      return month;
    }
  }, [month]);

  // Calculations for Today's Pacing
  const todayTarget = todayPoint?.todayRequired ?? dailyBreakEven.requiredForToday;
  const todayProfit = todayPoint?.todayProfit ?? dailyBreakEven.todayProfit;
  const remainingToday = Math.max(0, todayTarget - todayProfit);
  const todaySurplus = Math.max(0, todayProfit - todayTarget);

  const avgProfitPerOrder = breakEven.shopOrdersCount > 0 
    ? Math.max(50000, Math.round(breakEven.shopGrossProfit / breakEven.shopOrdersCount)) 
    : 250000;
  
  const estimatedOrdersNeededToday = remainingToday > 0 
    ? Math.max(1, Math.ceil(remainingToday / avgProfitPerOrder)) 
    : 0;

  // Chart computations (SVG Smooth area chart for 31 days)
  const chartPoints = dailyBreakEven.chartData;
  const maxDayProfit = Math.max(1, ...chartPoints.map((p) => Math.max(Math.abs(p.todayProfit), Math.abs(p.todayRequired))));

  return (
    <section className="space-y-4" aria-labelledby="finance-break-even-heading">
      {/* 1. MASTER BREAK-EVEN HERO BANNER */}
      <GlassCard
        glow={breakEven.isBreakEvenPassed ? "emerald" : "cyan"}
        className="relative overflow-hidden !p-5 sm:!p-6 bg-gradient-to-br from-slate-900/95 via-[#091122]/90 to-black/95 border-slate-800/80 backdrop-blur-3xl rounded-3xl"
      >
        {/* Subtle Ambient Glow Effect */}
        <div className={`pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full blur-3xl opacity-20 ${
          breakEven.isBreakEvenPassed ? "bg-emerald-500" : "bg-cyan-500"
        }`} />

        <div className="relative space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/70 pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl border ${
                breakEven.isBreakEvenPassed 
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/10" 
                  : "bg-cyan-500/15 text-cyan-400 border-cyan-500/30 shadow-lg shadow-cyan-500/10"
              }`}>
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span>Động Cơ Hòa Vốn & Lợi Nhuận Ròng</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-cyan-400 font-mono">{monthLabel}</span>
                </div>
                <h2 id="finance-break-even-heading" className="text-lg sm:text-2xl font-black text-white tracking-tight mt-0.5">
                  {breakEven.isBreakEvenPassed ? "Đã Bứt Phá Điểm Hòa Vốn" : "Hành Trình Bù Thâm Hụt Về 0 ₫"}
                </h2>
              </div>
            </div>

            {/* Status Badge */}
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold tracking-wide self-start sm:self-auto ${
              breakEven.isBreakEvenPassed
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10"
                : "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-amber-500/10"
            }`}>
              <span className={`w-2 h-2 rounded-full ${breakEven.isBreakEvenPassed ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
              <span>
                {breakEven.isBreakEvenPassed 
                  ? "VƯỢT HÒA VỐN (ĐANG SINH LÃI RÒNG)" 
                  : `TIẾN ĐỘ ${Math.round(breakEven.breakEvenPercent)}%`
                }
              </span>
            </div>
          </div>

          {/* Core Numbers Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Box 1: Lợi Nhuận Ròng Tháng */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>LỢI NHUẬN RÒNG THỰC TẾ</span>
                {breakEven.isBreakEvenPassed ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                )}
              </span>
              <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight mt-2 ${
                breakEven.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"
              }`}>
                {breakEven.netProfit >= 0 ? "+" : ""}{formatVND(breakEven.netProfit)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                {breakEven.isBreakEvenPassed 
                  ? "Khoản dôi dư hoàn toàn thuộc về bạn để tái đầu tư hoặc tích lũy." 
                  : `Cần tạo thêm ${formatVND(breakEven.remainingToBreakEven)} lãi gộp để cán mốc 0 ₫.`}
              </p>
            </div>

            {/* Box 2: Mục Tiêu Hòa Vốn Tháng */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>MỤC TIÊU HÒA VỐN THÁNG</span>
                <Target className="w-4 h-4 text-cyan-400" />
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mt-2">
                {formatVND(breakEven.breakEvenTarget)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
                <span>Cố định: <span className="text-slate-300 font-mono">{formatVND(breakEven.activeFixedCostsTotal)}</span></span>
                <span>Trả góp: <span className="text-slate-300 font-mono">{formatVND(breakEven.installmentsInMonthTotal)}</span></span>
              </p>
            </div>

            {/* Box 3: Lãi Gộp Shop Đã Đạt */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 sm:col-span-2 lg:col-span-1">
              <span className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>LÃI GỘP SHOP ĐÃ GHI NHẬN</span>
                <Flame className="w-4 h-4 text-amber-400" />
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-cyan-300 mt-2">
                {formatVND(breakEven.shopGrossProfit)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Từ <span className="text-white font-bold">{breakEven.shopOrdersCount} đơn</span> · Doanh thu <span className="text-slate-300 font-mono">{formatVND(breakEven.shopRevenue)}</span>
              </p>
            </div>
          </div>

          {/* Dynamic Interactive Multi-Stage Break-even Bar */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-950/40 border border-slate-800/60">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-300">Hành Trình Về Mốc Hòa Vốn</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {Math.round(breakEven.breakEvenPercent)}%
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {breakEven.isBreakEvenPassed ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Đã cán mốc hòa vốn
                  </span>
                ) : (
                  <span>Còn thiếu {formatVND(breakEven.remainingToBreakEven)}</span>
                )}
              </div>
            </div>

            {/* Progress track */}
            <div className="relative h-4 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden shadow-inner">
              {/* Center 0 marker */}
              <div className="absolute top-0 bottom-0 left-[100%] w-0.5 bg-white/40 z-10" />

              {/* Progress bar */}
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  breakEven.isBreakEvenPassed
                    ? "bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]"
                    : "bg-gradient-to-r from-rose-500 via-amber-400 to-cyan-400 shadow-[0_0_12px_rgba(56,189,248,0.4)]"
                }`}
                style={{ width: `${Math.min(100, Math.max(2, breakEven.breakEvenPercent))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-0.5">
              <span>Bắt đầu tháng: -{formatVND(breakEven.breakEvenTarget)}</span>
              <span className="font-bold text-amber-300">Điểm Mốc 0 ₫ (HÒA VỐN)</span>
              <span className="text-emerald-400 font-bold">Vùng Lợi Nhuận Ròng 🚀</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 2. TWO-COLUMN RADAR: DÒNG TIỀN THEO NGÀY & NHIỆM VỤ HÔM NAY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (8 cols): Biểu Đồ Nhịp Độ Dòng Tiền & Nợ Gối Đầu */}
        <div className="lg:col-span-8">
          <GlassCard className="!p-5 bg-gradient-to-br from-slate-900/90 to-slate-950/90 border-slate-800/80 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/70 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-cyan-400" />
                  Nhịp Độ Dòng Tiền Từng Ngày Trong Tháng
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lãi gộp thực tế của từng ngày so với định mức & nợ gối đầu
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
                  Lãi gộp ngày
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-400/80" />
                  Thiếu định mức
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-700" />
                  Chưa tới
                </span>
              </div>
            </div>

            {/* Interactive Day Columns Chart */}
            <div className="relative pt-2 pb-1">
              <div className="h-44 sm:h-52 flex items-end gap-1 sm:gap-1.5 px-1 overflow-x-auto overflow-y-hidden select-none">
                {chartPoints.map((item) => {
                  const isToday = item.day === currentDay;
                  const isSelected = selectedDay?.day === item.day;
                  const isFuture = item.isFuture;
                  const profit = item.todayProfit;
                  const heightPercent = isFuture 
                    ? 8 
                    : Math.max(12, Math.min(100, Math.round((Math.abs(profit) / maxDayProfit) * 100)));
                  const isPositive = profit >= item.todayRequired;

                  return (
                    <button
                      key={item.day}
                      type="button"
                      onClick={() => setSelectedDay(item)}
                      title={`Ngày ${item.day}: Lãi ${formatVND(profit)} (Cần ${formatVND(item.todayRequired)})`}
                      className={`group flex-1 min-w-[20px] sm:min-w-[24px] h-full flex flex-col justify-end items-center cursor-pointer rounded-t-lg px-0.5 pb-1 transition-colors ${
                        isSelected 
                          ? "bg-cyan-500/15 border-b-2 border-cyan-400" 
                          : "hover:bg-slate-800/40 border-b-2 border-transparent"
                      }`}
                    >
                      {/* Bar */}
                      <div
                        className={`w-full rounded-t-md transition-opacity duration-200 group-hover:opacity-90 ${
                          isFuture
                            ? "bg-slate-800"
                            : isPositive
                            ? isSelected
                              ? "bg-gradient-to-t from-cyan-400 to-emerald-300 shadow-md shadow-cyan-500/30"
                              : "bg-gradient-to-t from-cyan-500 to-emerald-400 shadow-sm shadow-cyan-500/20"
                            : isSelected
                            ? "bg-gradient-to-t from-rose-500 to-pink-400 shadow-md shadow-rose-500/30"
                            : "bg-gradient-to-t from-rose-600 to-rose-400 shadow-sm shadow-rose-500/20"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />

                      {/* Day Label & Indicator Container */}
                      <div className="flex flex-col items-center justify-center min-h-[22px] mt-1.5">
                        <span className={`text-[10px] font-mono leading-none transition-colors ${
                          isSelected 
                            ? "text-cyan-300 font-bold" 
                            : isToday 
                            ? "text-amber-400 font-bold" 
                            : "text-slate-500 group-hover:text-slate-300"
                        }`}>
                          {item.day}
                        </span>

                        {/* Dot for today - Isolated with absolute animation */}
                        {isToday && (
                          <div className="relative flex items-center justify-center w-1.5 h-1.5 mt-0.5">
                            <span className="absolute w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping opacity-75 pointer-events-none" />
                            <span className="relative w-1 h-1 rounded-full bg-amber-400" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Inspector */}
            {selectedDay && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-bold text-sm">
                    N{selectedDay.day}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Chi tiết Ngày {selectedDay.day}</span>
                      <span className="text-[10px] font-mono text-slate-400">{selectedDay.dateStr}</span>
                      {selectedDay.day === currentDay && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          HÔM NAY
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {selectedDay.isFuture ? (
                        "Ngày trong tương lai (Dự kiến)"
                      ) : (
                        <span>
                          <strong className="text-white">{selectedDay.ordersCount} đơn</strong> · Doanh thu <strong className="text-slate-300 font-mono">{formatVND(selectedDay.dailyRevenue)}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block">Cần đạt</span>
                    <span className="text-amber-300 font-semibold">{formatVND(selectedDay.todayRequired)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block">Lãi gộp</span>
                    <span className="text-cyan-300 font-semibold">{formatVND(selectedDay.todayProfit)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block">Số dư cuối</span>
                    <span className={`font-semibold ${selectedDay.rollingBalance >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {selectedDay.rollingBalance >= 0 ? "+" : ""}{formatVND(selectedDay.rollingBalance)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right Column (4 cols): Card Nhiệm Vụ Hôm Nay (Today's Mission) */}
        <div className="lg:col-span-4">
          <GlassCard
            glow={remainingToday === 0 ? "emerald" : "amber"}
            className="!p-5 bg-gradient-to-br from-slate-900/90 via-[#0a1324]/90 to-slate-950/90 border-slate-800/80 rounded-2xl flex flex-col justify-between h-full space-y-4"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800/70 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-cyan-400" />
                  Nhiệm Vụ Hôm Nay
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Ngày {currentDay}
                </span>
              </div>

              {/* Status & Amount */}
              <div className="my-4">
                <span className="text-xs text-slate-400 font-medium block">
                  {remainingToday > 0 ? "Lợi nhuận cần bù thêm hôm nay:" : "Trạng thái hôm nay:"}
                </span>
                <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight mt-1 ${
                  remainingToday > 0 ? "text-amber-300" : "text-emerald-300"
                }`}>
                  {remainingToday > 0 ? formatVND(remainingToday) : "ĐÃ ĐẠT CHỈ TIÊU"}
                </div>
                {remainingToday > 0 ? (
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                    <PackageCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Cần chốt thêm xấp xỉ <strong className="text-white font-mono">{estimatedOrdersNeededToday} đơn</strong></span>
                  </p>
                ) : (
                  <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Phần dôi dư <strong className="font-mono text-white">+{formatVND(todaySurplus)}</strong> đang làm nhẹ gánh cho các ngày tới!</span>
                  </p>
                )}
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Định mức gốc / ngày</span>
                  <span className="font-mono font-semibold text-slate-200 mt-0.5 block">
                    {formatVND(dailyBreakEven.dailyBurden)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Nợ hôm qua gối sang</span>
                  <span className="font-mono font-semibold text-rose-300 mt-0.5 block">
                    {formatVND(dailyBreakEven.carriedDebtIntoToday)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Tổng chỉ tiêu hôm nay</span>
                  <span className="font-mono font-semibold text-amber-300 mt-0.5 block">
                    {formatVND(todayTarget)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Đã ghi nhận hôm nay</span>
                  <span className="font-mono font-semibold text-cyan-300 mt-0.5 block">
                    {formatVND(todayProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Friendly Tip */}
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-300 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
              <span>
                Mỗi đơn hàng bán ra sẽ tự động giảm số tiền cần bù theo thời gian thực mà không cần nhập liệu thủ công.
              </span>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
};
