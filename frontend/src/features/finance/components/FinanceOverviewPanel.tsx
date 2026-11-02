import React, { useMemo, useState } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatVND } from "@/shared/utils";
import {
  Gauge,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { BreakEvenMetrics, DailyBreakEvenPoint, DailyBreakEvenStats, NetWorthMetrics } from "../types";

/** Thuật toán Catmull-Rom nối mượt mà các điểm thành đường cong Bézier */
function getSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/** Định dạng ngày hiển thị chuẩn mực DD/MM/YYYY */
function formatDateDisplay(dateStr?: string, dayNum?: number): string {
  if (!dateStr || dateStr.length < 10) return `Ngày ${dayNum || ""}`;
  const parts = dateStr.slice(0, 10).split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

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
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  // Calculations for Today's Pacing
  const todayTarget = todayPoint?.todayRequired ?? dailyBreakEven.requiredForToday;
  const todayProfit = todayPoint?.todayProfit ?? dailyBreakEven.todayProfit;
  const remainingToday = Math.max(0, todayTarget - todayProfit);

  const avgProfitPerOrder = breakEven.shopOrdersCount > 0 
    ? Math.max(50000, Math.round(breakEven.shopGrossProfit / breakEven.shopOrdersCount)) 
    : 250000;
  
  const estimatedOrdersNeededToday = remainingToday > 0 
    ? Math.max(1, Math.ceil(remainingToday / avgProfitPerOrder)) 
    : 0;

  // Chart computations
  const chartPoints = dailyBreakEven.chartData;

  // Radial Gauge Computations
  const gaugePercent = Math.min(100, Math.max(0, breakEven.breakEvenPercent || 0));

  return (
    <section className="space-y-4" aria-labelledby="finance-break-even-heading">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (8 cols): Biểu Đồ Đường Cong Lãi/Lỗ Hòa Vốn */}
        <div className="lg:col-span-8">
          <GlassCard className="!p-5 bg-gradient-to-br from-slate-900/90 to-slate-950/90 border-slate-800/80 rounded-2xl space-y-3 h-full flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Đường Cong Dòng Tiền & Ngày Hòa Vốn
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Quỹ đạo biến thiên lợi nhuận ròng qua từng ngày so với mốc 0 ₫
                </p>
              </div>

              {/* Legend trực quan theo 2 vùng LÃI / LỖ */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                  Thặng dư (Lãi)
                </span>
                <span className="flex items-center gap-1.5 text-rose-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" />
                  Thâm hụt (Âm)
                </span>
              </div>
            </div>

            {/* Interactive Coordinate SVG Chart */}
            {(() => {
              const svgWidth = 760;
              const svgHeight = 190;
              const padLeft = 55;
              const padRight = 25;
              const padTop = 22;
              const padBottom = 28;
              const plotW = svgWidth - padLeft - padRight;
              const plotH = svgHeight - padTop - padBottom;
              const zeroY = padTop + plotH / 2;

              const daysCount = dailyBreakEven.daysInMonth || 31;
              const target = breakEven.breakEvenTarget || 1;

              const pointsWithNet = chartPoints.map((item) => ({
                ...item,
                netVal: Number(item.cumulativeProfit || 0) - target,
              }));

              const maxAbs = Math.max(
                1000000,
                ...pointsWithNet.map((p) => Math.abs(p.netVal))
              ) * 1.25;

              const formatAxisVND = (val: number) => {
                if (val === 0) return "0 ₫";
                const abs = Math.abs(val);
                const sign = val > 0 ? "+" : "-";
                if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)} Tỷ`;
                if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)} Tr`;
                if (abs >= 1e3) return `${sign}${Math.round(abs / 1e3)}k`;
                return `${sign}${abs} ₫`;
              };

              const mapped = pointsWithNet.map((item) => {
                const x = padLeft + ((item.day - 1) / Math.max(1, daysCount - 1)) * plotW;
                const y = zeroY - (item.netVal / maxAbs) * (plotH / 2);
                return {
                  ...item,
                  x,
                  y: Math.max(padTop + 4, Math.min(svgHeight - padBottom - 4, y)),
                };
              });

              const pastNodes = mapped.filter((p) => p.day <= currentDay);
              const futureNodes = mapped.filter((p) => p.day >= currentDay);

              const pastWavePath = getSmoothPath(pastNodes);
              const futureWavePath = getSmoothPath(futureNodes);

              const areaWavePath = mapped.length > 0
                ? `${getSmoothPath(mapped)} L ${mapped[mapped.length - 1].x} ${zeroY} L ${mapped[0].x} ${zeroY} Z`
                : "";

              const crossingNode = mapped.find(
                (p) => p.cumulativeProfit >= target && target > 0 && !p.isFuture
              );

              return (
                <div 
                  className="relative flex-1 flex flex-col justify-center border border-slate-800/60 rounded-xl bg-slate-950/70 p-2 overflow-hidden select-none"
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {hoveredPoint && (
                    <div 
                      className="absolute z-45 pointer-events-none bg-slate-950/95 border border-cyan-500/50 shadow-2xl rounded-xl p-2.5 font-mono text-xs space-y-1 backdrop-blur-xl transition-all"
                      style={{
                        left: `${Math.min(Math.max(hoveredPoint.x - 70, 20), svgWidth - 160)}px`,
                        top: hoveredPoint.y < 100 ? `${hoveredPoint.y + 16}px` : `${hoveredPoint.y - 95}px`,
                      }}
                    >
                      <div className="text-slate-400 text-[10px] flex items-center justify-between border-b border-slate-800/80 pb-0.5">
                        <span>📅 {formatDateDisplay(hoveredPoint.dateStr, hoveredPoint.day)}</span>
                        <span className="text-cyan-400 font-bold">TÀI SẢN RÒNG</span>
                      </div>
                      <div className={`text-xs font-black ${hoveredPoint.netVal >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {formatVND(hoveredPoint.netVal)}
                      </div>
                    </div>
                  )}

                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-56 select-none overflow-visible">
                    <defs>
                      <clipPath id="panelProfitClip">
                        <rect x="0" y="0" width={svgWidth} height={zeroY} />
                      </clipPath>
                      <clipPath id="panelDeficitClip">
                        <rect x="0" y={zeroY} width={svgWidth} height={svgHeight - zeroY} />
                      </clipPath>
                    </defs>

                    {/* Trục Y */}
                    <line x1={padLeft} y1={padTop} x2={padLeft} y2={svgHeight - padBottom} stroke="#475569" strokeWidth="1.2" opacity="0.6" />
                    <text x={padLeft - 6} y={padTop + 4} textAnchor="end" fill="#34d399" fontSize="9" fontFamily="monospace">{formatAxisVND(maxAbs)}</text>
                    <text x={padLeft - 6} y={zeroY + 3} textAnchor="end" fill="#fbbf24" fontSize="9" fontFamily="monospace" fontWeight="bold">0 ₫</text>
                    <text x={padLeft - 6} y={svgHeight - padBottom} textAnchor="end" fill="#fb7185" fontSize="9" fontFamily="monospace">{formatAxisVND(-maxAbs)}</text>

                    {/* Đường mốc 0 ₫ ngang */}
                    <line x1={padLeft} y1={zeroY} x2={svgWidth - padRight} y2={zeroY} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />

                    {/* Grid dóng dọc */}
                    {[0.2, 0.4, 0.6, 0.8].map((pct, idx) => (
                      <line key={idx} x1={padLeft + pct * plotW} y1={padTop} x2={padLeft + pct * plotW} y2={svgHeight - padBottom} stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
                    ))}

                    {/* Area fills */}
                    {areaWavePath && (
                      <>
                        <path d={areaWavePath} fill="rgba(16, 185, 129, 0.18)" clipPath="url(#panelProfitClip)" />
                        <path d={areaWavePath} fill="rgba(244, 63, 94, 0.22)" clipPath="url(#panelDeficitClip)" />
                      </>
                    )}

                    {/* Smooth Bézier paths */}
                    {pastWavePath && (
                      <path d={pastWavePath} fill="none" stroke="#f43f5e" strokeWidth="3.5" strokeLinecap="round" />
                    )}
                    {futureWavePath && (
                      <path d={futureWavePath} fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="4 4" opacity="0.7" />
                    )}

                    {/* Nodes tương tác */}
                    {mapped.map((p) => (
                      <g key={p.day} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(p)} onClick={() => setSelectedDay(p)}>
                        <circle cx={p.x} cy={p.y} r="10" fill="transparent" />
                        {!p.isFuture && (
                          <circle cx={p.x} cy={p.y} r={p.day === currentDay ? 5 : 3.5} fill={p.netVal >= 0 ? "#10b981" : "#f43f5e"} stroke={p.day === currentDay ? "#ffffff" : "#091122"} strokeWidth="1.5" />
                        )}
                      </g>
                    ))}

                    {/* Điểm hòa vốn */}
                    {crossingNode && (
                      <g transform={`translate(${crossingNode.x}, ${crossingNode.y})`}>
                        <circle r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                        <text x="0" y="-14" textAnchor="middle" fill="#34d399" fontSize="10.5" fontFamily="monospace" fontWeight="extrabold">🌟 NGÀY HÒA VỐN ({formatDateDisplay(crossingNode.dateStr)})</text>
                      </g>
                    )}
                  </svg>
                </div>
              );
            })()}
          </GlassCard>
        </div>

        {/* Right Column (4 cols): ĐỒNG HỒ TIẾN ĐỘ HÒA VỐN (CHUẨN XÁC THEO ẢNH CỦA MASTER) */}
        <div className="lg:col-span-4">
          <GlassCard
            glow="amber"
            className="!p-5 bg-gradient-to-br from-slate-900/90 via-[#0a1324]/90 to-slate-950/90 border-slate-800/80 rounded-2xl flex flex-col justify-between h-full space-y-3"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  Đồng Hồ Tiến Độ Hòa Vốn
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Chỉ Tiêu Tháng
                </span>
              </div>

              {/* Radial Circular Gauge Chart */}
              <div className="flex items-center justify-center relative py-3">
                <svg viewBox="0 0 160 160" className="w-36 h-36">
                  {/* Track ngầm */}
                  <circle
                    cx="80"
                    cy="80"
                    r="62"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray="320"
                    strokeDashoffset="60"
                    transform="rotate(135 80 80)"
                  />
                  {/* Active Progress */}
                  <circle
                    cx="80"
                    cy="80"
                    r="62"
                    fill="none"
                    stroke={breakEven.isBreakEvenPassed ? "#10b981" : "#f59e0b"}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray="320"
                    strokeDashoffset={320 - (260 * gaugePercent) / 100}
                    transform="rotate(135 80 80)"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiến Độ</span>
                  <span className={`text-2xl font-black font-mono tracking-tight mt-0.5 ${
                    breakEven.isBreakEvenPassed ? "text-emerald-300" : "text-amber-300"
                  }`}>
                    {Math.round(breakEven.breakEvenPercent)}%
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                    Đã bù {formatVND(breakEven.shopGrossProfit)} / {formatVND(breakEven.breakEvenTarget)}
                  </span>
                </div>
              </div>
            </div>

            {/* Chỉ tiêu hôm nay (Hộp dưới đáy như trong ảnh) */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">
                  Chỉ tiêu hôm nay ({todayPoint?.dateStr ? formatDateDisplay(todayPoint.dateStr) : `Ngày ${currentDay}`}):
                </span>
                <span className="text-base font-black font-mono text-amber-300">
                  {formatVND(remainingToday)}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                ~{estimatedOrdersNeededToday > 0 ? estimatedOrdersNeededToday : 0} đơn hàng
              </span>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
};
