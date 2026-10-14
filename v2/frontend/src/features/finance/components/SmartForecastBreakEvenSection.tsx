import React, { useState, useMemo } from "react";
import { BreakEvenMetrics, DailyBreakEvenStats, DailyBreakEvenPoint } from "../types";
import {
  Sparkles,
  Target,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Zap
} from "lucide-react";

interface Props {
  breakEven: BreakEvenMetrics;
  dailyBreakEven: DailyBreakEvenStats;
  month: string;
}

const formatVND = (num: number) => {
  return Math.round(num).toLocaleString("vi-VN") + " ₫";
};

export const SmartForecastBreakEvenSection: React.FC<Props> = ({
  breakEven,
  dailyBreakEven,
  month,
}) => {
  const { chartData, dailyBurden, breakEvenDay, daysInMonth, currentDay: actualCurrentDay } = dailyBreakEven;

  const currentDay = actualCurrentDay || Math.min(daysInMonth, new Date().getDate());

  const [selectedDay, setSelectedDay] = useState<DailyBreakEvenPoint | null>(() => {
    const today = chartData.find((d) => d.day === currentDay);
    return today || chartData[0] || null;
  });

  // Tính toán chỉ số dự báo thông minh (Smart Forecast Engine)
  const forecastMetrics = useMemo(() => {
    const pastDays = chartData.filter((d) => !d.isFuture);
    const elapsedCount = Math.max(1, pastDays.length);
    const currentProfit = breakEven.shopGrossProfit;
    const avgProfitPerDay = Math.max(0, currentProfit / elapsedCount);
    const avgOrderProfit = breakEven.shopOrdersCount > 0 ? (currentProfit / breakEven.shopOrdersCount) : 250000;

    // Dự báo ngày hòa vốn
    let projectedDay: number | null = null;
    if (breakEven.isBreakEvenPassed) {
      projectedDay = breakEvenDay || currentDay;
    } else if (avgProfitPerDay > 0) {
      const remainingDeficit = breakEven.breakEvenTarget - currentProfit;
      const daysNeeded = Math.ceil(remainingDeficit / avgProfitPerDay);
      const estDay = currentDay + daysNeeded;
      if (estDay <= daysInMonth) {
        projectedDay = estDay;
      }
    }

    // Tốc độ bán hàng so với định mức (%)
    const requiredDailyAverage = daysInMonth > 0 ? (breakEven.breakEvenTarget / daysInMonth) : 1;
    const pacingPercent = requiredDailyAverage > 0
      ? Math.round((avgProfitPerDay / requiredDailyAverage) * 100)
      : 100;

    // Mục tiêu hành động hôm nay
    const todayData = chartData.find((d) => d.day === currentDay);
    const todayRequired = todayData ? todayData.todayRequired : dailyBurden;
    const todayProfit = todayData ? todayData.todayProfit : 0;
    const remainingForToday = Math.max(0, todayRequired - todayProfit);
    const ordersNeeded = remainingForToday > 0 ? Math.max(1, Math.ceil(remainingForToday / (avgOrderProfit || 250000))) : 0;
    const surplusToday = Math.max(0, todayProfit - todayRequired);

    return {
      avgProfitPerDay,
      avgOrderProfit,
      projectedDay,
      pacingPercent,
      todayRequired,
      todayProfit,
      remainingForToday,
      ordersNeeded,
      surplusToday,
    };
  }, [chartData, breakEven, breakEvenDay, currentDay, daysInMonth, dailyBurden]);

  // SVG Chart Dimensions
  const svgWidth = 720;
  const svgHeight = 250;
  const padding = { top: 30, bottom: 35, left: 65, right: 25 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  // Tính toán tọa độ và đường cong quá khứ vs dự phóng tương lai
  const chartPoints = useMemo(() => {
    if (!chartData || chartData.length === 0) return { min: -100, max: 100, points: [], zeroY: 125 };

    const target = breakEven.breakEvenTarget;
    const points: any[] = [];

    let min = -target;
    let max = breakEven.shopGrossProfit - target;

    // Quá khứ: số liệu thực tế
    // Tương lai: dự phóng theo avgProfitPerDay
    chartData.forEach((d) => {
      let val: number;
      if (d.day <= currentDay) {
        val = d.cumulativeProfit - target;
      } else {
        const futureDiff = d.day - currentDay;
        const projectedCumulative = breakEven.shopGrossProfit + futureDiff * forecastMetrics.avgProfitPerDay;
        val = projectedCumulative - target;
      }

      if (val < min) min = val;
      if (val > max) max = val;
    });

    if (min === 0 && max === 0) {
      min = -1000000;
      max = 1000000;
    } else {
      const buffer = Math.max(Math.abs(min), Math.abs(max)) * 0.15;
      min -= buffer;
      max += buffer;
    }

    if (min > 0) min = 0;
    if (max < 0) max = 0;

    const range = max - min || 1;
    const zeroY = padding.top + chartH - ((0 - min) / range) * chartH;

    chartData.forEach((d, idx) => {
      let val: number;
      const isPastOrToday = d.day <= currentDay;
      if (isPastOrToday) {
        val = d.cumulativeProfit - target;
      } else {
        const futureDiff = d.day - currentDay;
        const projectedCumulative = breakEven.shopGrossProfit + futureDiff * forecastMetrics.avgProfitPerDay;
        val = projectedCumulative - target;
      }

      const x = padding.left + (idx / (chartData.length - 1 || 1)) * chartW;
      const y = padding.top + chartH - ((val - min) / range) * chartH;

      points.push({
        ...d,
        x,
        y,
        val,
        isPastOrToday,
      });
    });

    return { min, max, points, zeroY };
  }, [chartData, breakEven, currentDay, forecastMetrics.avgProfitPerDay, chartW, chartH, padding.left, padding.top]);

  // Tạo đường path SVG
  const { pastLinePath, futureLinePath } = useMemo(() => {
    const { points } = chartPoints;
    if (points.length === 0) return { pastLinePath: "", futureLinePath: "" };

    const pastPts = points.filter((p: any) => p.isPastOrToday);
    const futurePts = points.filter((p: any) => p.day >= currentDay);

    const pastLine = pastPts.map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const futureLine = futurePts.map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

    return { pastLinePath: pastLine, futureLinePath: futureLine };
  }, [chartPoints, currentDay]);

  const percent = Math.min(100, Math.max(0, breakEven.breakEvenPercent));
  const isPassed = breakEven.isBreakEvenPassed;

  return (
    <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-5 sm:p-7 backdrop-blur-xl space-y-6 shadow-2xl relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      {/* 1. Header & Net Profit Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Dự Báo Dòng Tiền & Điểm Hòa Vốn
            </h2>
          </div>
        </div>

        {/* Net Profit Pill */}
        <div
          className={`px-4 py-2 rounded-2xl border flex items-center gap-2.5 shadow-lg self-start sm:self-auto ${
            isPassed
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {isPassed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">
              {isPassed ? "Lợi Nhuận Ròng (Có Lãi)" : "Lợi Nhuận Tháng (Đang Âm)"}
            </span>
            <span className="text-base sm:text-lg font-mono font-black">
              {breakEven.netProfit >= 0
                ? `+${formatVND(breakEven.netProfit)}`
                : `-${formatVND(Math.abs(breakEven.netProfit))}`}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Horizontal Break-Even Journey Gauge */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono font-bold">
          <span className="text-rose-400 flex items-center gap-1">
            Khởi điểm: -{formatVND(breakEven.breakEvenTarget)}
          </span>
          <span
            className={`font-sans uppercase tracking-widest text-[11px] font-black ${
              isPassed ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {isPassed ? `🎉 ĐÃ VƯỢT HÒA VỐN (${percent}%)` : `Tiến độ hòa vốn: ${percent}%`}
          </span>
          <span className="text-slate-400 flex items-center gap-1">
            Mốc 0 ₫ (HÒA VỐN)
          </span>
        </div>

        <div className="w-full bg-slate-950 h-3 rounded-full p-0.5 border border-slate-800 overflow-hidden relative shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out relative ${
              isPassed
                ? "bg-gradient-to-r from-cyan-500 via-emerald-400 to-emerald-300 shadow-lg shadow-emerald-500/30"
                : "bg-gradient-to-r from-rose-500 via-amber-500 to-cyan-400"
            }`}
            style={{ width: `${percent}%` }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/80 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* 3. Main Center: Two-Column Forecast & Action Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Interactive Prediction Wave Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-950/80 rounded-2xl border border-slate-800/90 p-4 space-y-3 relative overflow-hidden flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Đường Cong Bù Âm & Dự Phóng Hòa Vốn
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> Thực tế
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-1 border-t-2 border-dashed border-emerald-400 inline-block" /> Dự báo tương lai
              </span>
            </div>
          </div>

          {/* SVG Chart */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full min-w-[500px] h-[210px] select-none"
            >
              <defs>
                <linearGradient id="solidGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="60%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Zero Line (0 ₫ Hòa Vốn) */}
              <line
                x1={padding.left}
                y1={chartPoints.zeroY}
                x2={svgWidth - padding.right}
                y2={chartPoints.zeroY}
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                opacity="0.8"
              />
              <text
                x={padding.left - 6}
                y={chartPoints.zeroY + 3.5}
                textAnchor="end"
                fill="#38bdf8"
                fontSize="10"
                fontWeight="bold"
                className="font-mono"
              >
                0 ₫
              </text>

              {/* Max / Min Y Labels */}
              <text
                x={padding.left - 6}
                y={padding.top + 4}
                textAnchor="end"
                fill="#94a3b8"
                fontSize="9"
                className="font-mono"
              >
                +{formatVND(chartPoints.max)}
              </text>
              <text
                x={padding.left - 6}
                y={padding.top + chartH}
                textAnchor="end"
                fill="#94a3b8"
                fontSize="9"
                className="font-mono"
              >
                {formatVND(chartPoints.min)}
              </text>

              {/* Solid Past Line */}
              {pastLinePath && (
                <path
                  d={pastLinePath}
                  fill="none"
                  stroke="url(#solidGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  filter="url(#neonGlow)"
                />
              )}

              {/* Dashed Future Line */}
              {futureLinePath && (
                <path
                  d={futureLinePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.85"
                />
              )}

              {/* Projected / Actual Break-Even Flag Milestone */}
              {forecastMetrics.projectedDay && (
                (() => {
                  const pt = chartPoints.points.find((p: any) => p.day === forecastMetrics.projectedDay);
                  if (!pt) return null;
                  return (
                    <g>
                      <line
                        x1={pt.x}
                        y1={padding.top}
                        x2={pt.x}
                        y2={padding.top + chartH}
                        stroke="#10b981"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="5"
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="animate-pulse"
                      />
                      <rect
                        x={pt.x - 55}
                        y={padding.top - 20}
                        width="110"
                        height="18"
                        rx="4"
                        fill="#064e3b"
                        stroke="#10b981"
                        strokeWidth="1"
                      />
                      <text
                        x={pt.x}
                        y={padding.top - 7}
                        textAnchor="middle"
                        fill="#a7f3d0"
                        fontSize="9"
                        fontWeight="bold"
                        className="font-mono"
                      >
                        {isPassed ? `HÒA VỐN N${pt.day}` : `DỰ KIẾN HÒA VỐN N${pt.day}`}
                      </text>
                    </g>
                  );
                })()
              )}

              {/* Interactive Points */}
              {chartPoints.points.map((p: any) => {
                const isToday = p.day === currentDay;
                const isSelected = selectedDay?.day === p.day;

                return (
                  <g
                    key={p.day}
                    className="cursor-pointer"
                    onClick={() => setSelectedDay(p)}
                  >
                    {/* Day X Labels */}
                    {(p.day === 1 || p.day % 5 === 0 || p.day === daysInMonth) && (
                      <text
                        x={p.x}
                        y={svgHeight - 12}
                        textAnchor="middle"
                        fill={isToday ? "#38bdf8" : "#64748b"}
                        fontSize={isToday ? "10" : "9"}
                        fontWeight={isToday ? "bold" : "normal"}
                        className="font-mono"
                      >
                        N{p.day}
                      </text>
                    )}

                    {/* Point Circle */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isSelected ? 5.5 : isToday ? 4.5 : 2.5}
                      fill={p.val >= 0 ? "#10b981" : p.isPastOrToday ? "#f43f5e" : "#475569"}
                      stroke={isSelected ? "#ffffff" : "#0f172a"}
                      strokeWidth={isSelected ? 2 : 1}
                      opacity={p.isPastOrToday ? 1 : 0.6}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Column: AI Action Goal & Pacing Card (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          {/* Action Goal Card (Neon Glow Box) */}
          <div className="relative rounded-2xl p-5 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-cyan-950/40 border border-cyan-500/30 shadow-xl shadow-cyan-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <Target className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Mục Tiêu Hôm Nay (Ngày {currentDay})
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-bold">
                CHỈ SỐ HÀNH ĐỘNG
              </span>
            </div>

            {/* Smart Actionable Message */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed">
              {forecastMetrics.remainingForToday > 0 ? (
                <span>
                  Chỉ cần bán thêm{" "}
                  <strong className="text-amber-300 font-mono font-bold text-base">
                    ~{formatVND(forecastMetrics.remainingForToday)}
                  </strong>{" "}
                  <span className="text-slate-400">
                    (khoảng {forecastMetrics.ordersNeeded} đơn hàng)
                  </span>{" "}
                  hôm nay để không phải gối nợ sang ngày mai!
                </span>
              ) : (
                <span className="text-emerald-300 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Đã hoàn thành xuất sắc chỉ tiêu hôm nay! Đang thặng dư +{formatVND(forecastMetrics.surplusToday)}.
                </span>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">Định Mức Ngày</span>
                <span className="font-mono font-bold text-white text-sm block mt-0.5">
                  {formatVND(dailyBurden)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">Lãi Gộp Hôm Nay</span>
                <span className="font-mono font-bold text-cyan-300 text-sm block mt-0.5">
                  {formatVND(forecastMetrics.todayProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Speed & Savings Tracker Box */}
          <div className="rounded-2xl p-4 bg-slate-950/70 border border-slate-800/90 space-y-3 shadow-lg">
            {/* Tốc độ bán hàng */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Tốc độ bán hàng
                </span>
                <span className={`font-mono font-bold ${
                  forecastMetrics.pacingPercent >= 100 ? "text-emerald-400" : "text-amber-400"
                }`}>
                  {forecastMetrics.pacingPercent}% kế hoạch
                </span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    forecastMetrics.pacingPercent >= 100
                      ? "bg-gradient-to-r from-cyan-400 to-emerald-400"
                      : "bg-gradient-to-r from-rose-500 to-amber-400"
                  }`}
                  style={{ width: `${Math.min(100, forecastMetrics.pacingPercent)}%` }}
                />
              </div>
            </div>

            {/* Quỹ tích lũy tháng / Lãi ròng */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
              <span className="text-slate-400 font-medium">Lợi nhuận ròng tháng:</span>
              <span className={`font-mono font-bold text-sm ${
                breakEven.netProfit >= 0 ? "text-emerald-300" : "text-rose-400"
              }`}>
                {breakEven.netProfit >= 0 ? `+${formatVND(breakEven.netProfit)}` : `-${formatVND(Math.abs(breakEven.netProfit))}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Daily Heatmap Pill Strip (Thước đo 31 ngày) */}
      <div className="space-y-2 pt-2 border-t border-slate-800/60">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            Nhịp Độ Theo Từng Ngày Trong Tháng ({month})
          </span>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-16 lg:grid-cols-31 gap-1.5">
          {chartData.map((d) => {
            const isSelected = selectedDay?.day === d.day;
            const isToday = d.day === currentDay;
            const isDebtFree = d.isDebtFreeToday;

            return (
              <button
                key={d.day}
                onClick={() => setSelectedDay(d)}
                className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer border text-xs flex flex-col items-center justify-center ${
                  isSelected
                    ? "bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/20 scale-105 z-10"
                    : isToday
                    ? "bg-slate-800 border-cyan-500/60 text-cyan-300 ring-1 ring-cyan-500/30"
                    : d.isFuture
                    ? "bg-slate-950/40 border-slate-800/40 text-slate-600 opacity-50"
                    : isDebtFree
                    ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40"
                    : "bg-rose-950/30 border-rose-500/30 text-rose-300 hover:bg-rose-900/40"
                }`}
                title={`Ngày ${d.day}`}
              >
                <span className="font-mono text-[11px] font-bold">{d.day}</span>
                <span className="text-[9px] mt-0.5">
                  {d.isFuture ? (
                    "•"
                  ) : isDebtFree ? (
                    <span className="text-emerald-400">✓</span>
                  ) : (
                    <span className="text-rose-400">✕</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Selected Day Detail Strip */}
      {selectedDay && (
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono font-bold">
              NGÀY {selectedDay.day} ({selectedDay.dateStr})
            </span>
            {selectedDay.day === currentDay && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold animate-pulse">
                HÔM NAY
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-300">
            <div>
              <span className="text-slate-500 text-[11px] block">Nợ Mang Sang</span>
              <span className="font-mono font-bold text-rose-400">
                {selectedDay.previousDebt > 0 ? `-${formatVND(selectedDay.previousDebt)}` : "0 ₫"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Chỉ Tiêu Cần Đạt</span>
              <span className="font-mono font-bold text-amber-400">
                {formatVND(selectedDay.todayRequired)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Lãi Gộp Đạt Được</span>
              <span className="font-mono font-bold text-cyan-300">
                {formatVND(selectedDay.todayProfit)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Số Dư Sau Ngày</span>
              <span className={`font-mono font-bold ${
                selectedDay.rollingBalance >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}>
                {selectedDay.rollingBalance >= 0 ? "+" : ""}
                {formatVND(selectedDay.rollingBalance)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
