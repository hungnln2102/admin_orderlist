import React, { useMemo, useState } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatVND } from "@/shared/utils";
import {
  Gauge,
  Sparkles,
  TrendingUp,
  CheckCircle2,
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

/** Định dạng rút gọn số tiền lớn cho SVG Gauge (Tr / M / k) để không bị tràn chữ */
function formatCompactCurrency(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)} Tỷ`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${Math.round(abs / 1e3)}k`;
  return `${sign}${abs} ₫`;
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
  const isYearMode = Boolean(month && month.length === 4) || (dailyBreakEven.daysInMonth > 35);
  const periodLabel = isYearMode
    ? "Chỉ Tiêu Năm"
    : dailyBreakEven.daysInMonth > 14
    ? "Chỉ Tiêu Tháng"
    : "Chỉ Tiêu Tuần";

  // Lấy ngày hiện tại chuẩn giờ Việt Nam
  const todayVNStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }, []);

  const chartPoints = dailyBreakEven.chartData || [];

  // Tìm điểm tương ứng hôm nay: ưu tiên khớp dateStr, nếu không lấy theo currentDay
  const todayPoint = useMemo(() => {
    return (
      chartPoints.find((item) => item.dateStr === todayVNStr) ||
      chartPoints.find((item) => item.day === dailyBreakEven.currentDay) ||
      (chartPoints.length > 0 ? chartPoints[Math.min(chartPoints.length - 1, (dailyBreakEven.currentDay || 1) - 1)] : null) || {
        day: dailyBreakEven.currentDay || 1,
        dateStr: todayVNStr,
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
      }
    );
  }, [chartPoints, todayVNStr, dailyBreakEven, breakEven]);

  const currentDay = todayPoint?.day || dailyBreakEven.currentDay || 1;

  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  // Calculations for Today's Pacing
  const todayTarget = todayPoint?.todayRequired ?? dailyBreakEven.requiredForToday;
  const todayProfit = todayPoint?.todayProfit ?? dailyBreakEven.todayProfit;
  const remainingToday = Math.max(0, todayTarget - todayProfit);

  const avgProfitPerOrder =
    breakEven.shopOrdersCount > 0
      ? Math.max(50000, Math.round(breakEven.shopGrossProfit / breakEven.shopOrdersCount))
      : 250000;

  const estimatedOrdersNeededToday =
    remainingToday > 0 ? Math.max(1, Math.ceil(remainingToday / avgProfitPerOrder)) : 0;

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
                  Quỹ đạo biến thiên lợi nhuận ròng {isYearMode ? "theo từng ngày trong năm" : "qua từng ngày"} so với mốc 0 ₫
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
                {breakEven.isBreakEvenPassed && (
                  <span className="flex items-center gap-1 text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded-full border border-cyan-500/30 text-[11px] font-mono">
                    <Sparkles className="w-3 h-3 text-cyan-400" /> Đã hòa vốn
                  </span>
                )}
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

              const daysCount = dailyBreakEven.daysInMonth || (chartPoints.length > 0 ? chartPoints.length : 31);
              const target = breakEven.breakEvenTarget || 1;
              const isDenseChart = daysCount > 35; // Chế độ năm (365 ngày)

              const pointsWithNet = chartPoints.map((item) => ({
                ...item,
                netVal: Number(item.cumulativeProfit || 0) - target,
              }));

              const maxAbs =
                Math.max(
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

              // Chỉ tính các điểm ĐÃ DIỄN RA (<= currentDay)
              const pastNodes = mapped.filter((p) => p.day <= currentDay);
              const futureNodes = mapped.filter((p) => p.day >= currentDay);

              const pastWavePath = getSmoothPath(pastNodes);
              const futureWavePath = futureNodes.length > 1 ? getSmoothPath(futureNodes) : "";

              // Area fill CHỈ TÔ VÙNG QUÁ KHỨ ĐẾN HÔM NAY (Không tô tràn sang tương lai thành khối chữ nhật phẳng)
              const areaWavePath =
                pastNodes.length > 0
                  ? `${getSmoothPath(pastNodes)} L ${pastNodes[pastNodes.length - 1].x} ${zeroY} L ${pastNodes[0].x} ${zeroY} Z`
                  : "";

              // Điểm hòa vốn đầu tiên
              const crossingNode = mapped.find(
                (p) => p.cumulativeProfit >= target && target > 0 && !p.isFuture
              );

              // Điểm hôm nay trên biểu đồ
              const todayNode = mapped.find((p) => p.day === currentDay) || pastNodes[pastNodes.length - 1];

              // Xử lý di chuột trên SVG để hiển thị crosshair tương tác mượt mà
              const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const svgX = (mouseX / rect.width) * svgWidth;

                if (svgX < padLeft || svgX > svgWidth - padRight || pastNodes.length === 0) {
                  return;
                }

                // Tìm điểm gần nhất theo trục X trong số các điểm đã diễn ra
                let closest = pastNodes[0];
                let minDiff = Math.abs(pastNodes[0].x - svgX);
                for (let i = 1; i < pastNodes.length; i++) {
                  const diff = Math.abs(pastNodes[i].x - svgX);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closest = pastNodes[i];
                  }
                }
                setHoveredPoint(closest);
              };

              return (
                <div
                  className="relative flex-1 flex flex-col justify-center border border-slate-800/60 rounded-xl bg-slate-950/70 p-2 overflow-hidden select-none"
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Tooltip khi hover */}
                  {hoveredPoint && (
                    <div
                      className="absolute z-45 pointer-events-none bg-slate-950/95 border border-cyan-500/50 shadow-2xl rounded-xl p-2.5 font-mono text-xs space-y-1 backdrop-blur-xl transition-all"
                      style={{
                        left: `${Math.min(Math.max(hoveredPoint.x - 70, 20), svgWidth - 170)}px`,
                        top: hoveredPoint.y < 95 ? `${hoveredPoint.y + 16}px` : `${hoveredPoint.y - 85}px`,
                      }}
                    >
                      <div className="text-slate-400 text-[10px] flex items-center justify-between border-b border-slate-800/80 pb-0.5 gap-2">
                        <span>📅 {formatDateDisplay(hoveredPoint.dateStr, hoveredPoint.day)}</span>
                        <span className="text-cyan-400 font-bold">LỢI NHUẬN RÒNG</span>
                      </div>
                      <div
                        className={`text-xs font-black ${
                          hoveredPoint.netVal >= 0 ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {formatVND(hoveredPoint.netVal)}
                      </div>
                    </div>
                  )}

                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-56 select-none overflow-visible cursor-crosshair"
                    onMouseMove={handleSvgMouseMove}
                  >
                    <defs>
                      <clipPath id="panelProfitClip">
                        <rect x="0" y="0" width={svgWidth} height={zeroY} />
                      </clipPath>
                      <clipPath id="panelDeficitClip">
                        <rect x="0" y={zeroY} width={svgWidth} height={svgHeight - zeroY} />
                      </clipPath>
                    </defs>

                    {/* Trục Y */}
                    <line
                      x1={padLeft}
                      y1={padTop}
                      x2={padLeft}
                      y2={svgHeight - padBottom}
                      stroke="#475569"
                      strokeWidth="1.2"
                      opacity="0.6"
                    />
                    <text
                      x={padLeft - 6}
                      y={padTop + 4}
                      textAnchor="end"
                      fill="#34d399"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {formatAxisVND(maxAbs)}
                    </text>
                    <text
                      x={padLeft - 6}
                      y={zeroY + 3}
                      textAnchor="end"
                      fill="#fbbf24"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      0 ₫
                    </text>
                    <text
                      x={padLeft - 6}
                      y={svgHeight - padBottom}
                      textAnchor="end"
                      fill="#fb7185"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {formatAxisVND(-maxAbs)}
                    </text>

                    {/* Đường mốc 0 ₫ ngang */}
                    <line
                      x1={padLeft}
                      y1={zeroY}
                      x2={svgWidth - padRight}
                      y2={zeroY}
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      opacity="0.8"
                    />

                    {/* Grid dóng dọc (phân bổ đều) */}
                    {[0.2, 0.4, 0.6, 0.8].map((pct, idx) => (
                      <line
                        key={idx}
                        x1={padLeft + pct * plotW}
                        y1={padTop}
                        x2={padLeft + pct * plotW}
                        y2={svgHeight - padBottom}
                        stroke="#1e293b"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                    ))}

                    {/* Area fills chỉ bao phủ các ngày đã qua, không vẽ tràn sang tương lai */}
                    {areaWavePath && (
                      <>
                        <path
                          d={areaWavePath}
                          fill="rgba(16, 185, 129, 0.20)"
                          clipPath="url(#panelProfitClip)"
                        />
                        <path
                          d={areaWavePath}
                          fill="rgba(244, 63, 94, 0.22)"
                          clipPath="url(#panelDeficitClip)"
                        />
                      </>
                    )}

                    {/* Smooth Bézier paths: Đường thực tế đã qua */}
                    {pastWavePath && (
                      <path
                        d={pastWavePath}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Đường tương lai mờ nhạt (dashed) nếu có */}
                    {futureWavePath && (
                      <path
                        d={futureWavePath}
                        fill="none"
                        stroke="#475569"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray="4 4"
                        opacity="0.4"
                      />
                    )}

                    {/* Nodes tương tác: Trong chế độ Tháng vẽ từng điểm, Chế độ Năm chỉ vẽ các mốc chính */}
                    {!isDenseChart ? (
                      mapped.map((p) => (
                        <g
                          key={p.day}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPoint(p)}
                          onClick={() => setHoveredPoint(p)}
                        >
                          <circle cx={p.x} cy={p.y} r="8" fill="transparent" />
                          {!p.isFuture && (
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={p.day === currentDay ? 5 : 3.5}
                              fill={p.netVal >= 0 ? "#10b981" : "#f43f5e"}
                              stroke={p.day === currentDay ? "#ffffff" : "#091122"}
                              strokeWidth="1.5"
                            />
                          )}
                        </g>
                      ))
                    ) : (
                      // Trong chế độ Năm (365 ngày): Vẽ điểm hôm nay nổi bật
                      todayNode && (
                        <g transform={`translate(${todayNode.x}, ${todayNode.y})`}>
                          <circle r="8" fill="#06b6d4" opacity="0.3" className="animate-ping" />
                          <circle r="5" fill="#22d3ee" stroke="#ffffff" strokeWidth="2" />
                        </g>
                      )
                    )}

                    {/* Crosshair khi hover chuột */}
                    {hoveredPoint && (
                      <g pointerEvents="none">
                        <line
                          x1={hoveredPoint.x}
                          y1={padTop}
                          x2={hoveredPoint.x}
                          y2={svgHeight - padBottom}
                          stroke="#06b6d4"
                          strokeWidth="1.2"
                          strokeDasharray="3 3"
                          opacity="0.75"
                        />
                        <circle
                          cx={hoveredPoint.x}
                          cy={hoveredPoint.y}
                          r="5.5"
                          fill="#38bdf8"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      </g>
                    )}

                    {/* Điểm mốc hòa vốn nổi bật */}
                    {crossingNode && (
                      <g transform={`translate(${crossingNode.x}, ${crossingNode.y})`}>
                        <circle r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                        <text
                          x="0"
                          y="-14"
                          textAnchor="middle"
                          fill="#34d399"
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight="extrabold"
                        >
                          🌟 HÒA VỐN ({formatDateDisplay(crossingNode.dateStr)})
                        </text>
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
            glow={breakEven.isBreakEvenPassed ? "emerald" : "amber"}
            className="!p-5 bg-gradient-to-br from-slate-900/90 via-[#0a1324]/90 to-slate-950/90 border-slate-800/80 rounded-2xl flex flex-col justify-between h-full space-y-3"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  Đồng Hồ Tiến Độ Hòa Vốn
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    breakEven.isBreakEvenPassed
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  }`}
                >
                  {periodLabel}
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
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Tiến Độ
                  </span>
                  <span
                    className={`text-2xl font-black font-mono tracking-tight mt-0.5 ${
                      breakEven.isBreakEvenPassed ? "text-emerald-300" : "text-amber-300"
                    }`}
                  >
                    {Math.round(breakEven.breakEvenPercent)}%
                  </span>
                  {/* Định dạng rút gọn 103.4M / 12.4M để không bị tràn chữ mờ */}
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 font-semibold">
                    Đã bù {formatCompactCurrency(breakEven.shopGrossProfit)} / {formatCompactCurrency(breakEven.breakEvenTarget)}
                  </span>
                </div>
              </div>
            </div>

            {/* Chỉ tiêu hôm nay / Trạng thái hòa vốn */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                breakEven.isBreakEvenPassed
                  ? "bg-emerald-950/40 border-emerald-500/30"
                  : "bg-slate-950/80 border-slate-800"
              }`}
            >
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">
                  Chỉ tiêu hôm nay ({formatDateDisplay(todayPoint?.dateStr, currentDay)}):
                </span>
                <span
                  className={`text-base font-black font-mono ${
                    breakEven.isBreakEvenPassed ? "text-emerald-300" : "text-amber-300"
                  }`}
                >
                  {breakEven.isBreakEvenPassed ? "0 ₫ (Đã hoàn thành)" : formatVND(remainingToday)}
                </span>
              </div>
              {breakEven.isBreakEvenPassed ? (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Đạt Hòa Vốn
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                  ~{estimatedOrdersNeededToday > 0 ? estimatedOrdersNeededToday : 0} đơn hàng
                </span>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
};