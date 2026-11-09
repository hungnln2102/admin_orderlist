import React from "react";
import { Eye, Users, Activity, Clock, Percent, UserCheck, RefreshCw, Search, ArrowUpDown, ArrowUp, ArrowDown, Download, Globe, Smartphone, Monitor, Tablet, ExternalLink, Calendar, Share2, FileText, MapPin, CheckCircle2, Info, BarChart3, Layers } from "lucide-react";
import { GlassCard } from "@/shared/components/GlassCard";
import { DailyTrafficItem, TrafficApiResponse } from "../types";

interface TrafficChartProps {
  data: TrafficApiResponse | null;
  days: number;
  chartPoints: DailyTrafficItem[];
  hoveredChartIdx: number | null;
  setHoveredChartIdx: React.Dispatch<React.SetStateAction<number | null>>;
  maxVal: number;
  getPtX: (idx: number) => number;
  getPtY: (value: number) => number;
  pageviewLine: string;
  visitorLine: string;
  baselineY: number;
  pageviewArea: string;
  visitorArea: string;
}

export const TrafficChart: React.FC<TrafficChartProps> = ({ data, days, chartPoints, hoveredChartIdx, setHoveredChartIdx, maxVal, getPtX, getPtY, pageviewLine, visitorLine, baselineY, pageviewArea, visitorArea }) => {
  const svgWidth = 1000;
  const svgHeight = 260;
  const paddingX = 40;
  const paddingTop = 20;
  const paddingBottom = 40;
  const usableW = svgWidth - paddingX * 2;
  const usableH = svgHeight - paddingTop - paddingBottom;

  return (
  <>
      {/* 3. Khối Biểu Đồ Trực Quan (SVG Native High-Performance) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ 1: Lưu Lượng Theo Thời Gian (Area Chart) */}
        <GlassCard className="lg:col-span-2 !p-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Biến Động Lưu Lượng Theo Thời Gian</span>
                <span className="text-[11px] font-mono text-slate-400 font-normal">
                  ({days === 1 ? "24 mốc giờ" : `${chartPoints.length} mốc ngày`})
                </span>
              </h2>
              <p className="text-xs text-slate-400">So sánh tương quan giữa Lượt xem trang (Pageviews) và Khách truy cập (Visitors)</p>
            </div>

            {/* Chú thích biểu đồ (Legend) */}
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
                <span className="text-indigo-300">Lượt Xem (Pageviews)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-400 shadow-sm shadow-sky-400/50" />
                <span className="text-sky-300">Khách Truy Cập (Visitors)</span>
              </div>
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="relative w-full h-[260px] select-none">
            {chartPoints.length > 0 ? (
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                <defs>
                  {/* Gradient Pageviews (Indigo/Purple) */}
                  <linearGradient id="trafficPvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                  {/* Gradient Visitors (Sky/Cyan) */}
                  <linearGradient id="trafficVisGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Vạch lưới ngang mờ */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const y = paddingTop + usableH * (1 - pct);
                  const val = Math.round(maxVal * pct);
                  return (
                    <g key={idx}>
                      <line x1={paddingX} y1={y} x2={svgWidth - paddingX} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                      <text x={paddingX - 10} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end" className="font-mono">
                        {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                      </text>
                    </g>
                  );
                })}

                {/* Vùng Area Gradient */}
                {pageviewArea && <path d={pageviewArea} fill="url(#trafficPvGrad)" />}
                {visitorArea && <path d={visitorArea} fill="url(#trafficVisGrad)" />}

                {/* Đường viền mượt Bezier */}
                {pageviewLine && <path d={pageviewLine} fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />}
                {visitorLine && <path d={visitorLine} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />}

                {/* Nhãn ngày trục hoành (hiển thị thông minh) */}
                {chartPoints.map((pt, i) => {
                  const step = Math.max(1, Math.floor(chartPoints.length / 8));
                  const isVisible = i % step === 0 || i === chartPoints.length - 1;
                  if (!isVisible) return null;
                  const x = getPtX(i);
                  return (
                    <text key={i} x={x} y={svgHeight - 12} fill="#64748b" fontSize="11" textAnchor="middle" className="font-mono">
                      {pt.date}
                    </text>
                  );
                })}

                {/* Các điểm tròn tương tác khi hover */}
                {chartPoints.map((pt, i) => {
                  const pX = getPtX(i);
                  const isHovered = hoveredChartIdx === i;
                  return (
                    <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredChartIdx(i)} onMouseLeave={() => setHoveredChartIdx(null)}>
                      {/* Transparent hit target */}
                      <rect x={pX - usableW / (chartPoints.length * 2)} y={paddingTop} width={usableW / chartPoints.length} height={usableH} fill="transparent" />

                      {isHovered && (
                        <>
                          <line x1={pX} y1={paddingTop} x2={pX} y2={baselineY} stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
                          <circle cx={pX} cy={getPtY(pt.pageviews)} r="5" fill="#818cf8" stroke="#ffffff" strokeWidth="2" />
                          <circle cx={pX} cy={getPtY(pt.visitors)} r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm gap-2">
                <BarChart3 className="w-8 h-8 text-slate-600" />
                <span>Chưa phát sinh lượt truy cập trong khoảng thời gian này</span>
              </div>
            )}

            {/* Hover Tooltip Box */}
            {hoveredChartIdx !== null && chartPoints[hoveredChartIdx] && (
              <div
                className="absolute z-30 pointer-events-none bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-xl text-xs space-y-1.5 transition-all"
                style={{
                  left: `${Math.min(80, Math.max(15, (getPtX(hoveredChartIdx) / svgWidth) * 100))}%`,
                  top: "20px",
                  transform: "translateX(-50%)",
                }}
              >
                <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between gap-4 font-mono">
                  <span>Ngày {chartPoints[hoveredChartIdx].date}</span>
                  <span className="text-[10px] text-slate-400 font-sans">{chartPoints[hoveredChartIdx].sessions} phiên</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-indigo-300 font-medium">Lượt xem trang:</span>
                  <span className="font-bold font-mono text-white">{chartPoints[hoveredChartIdx].pageviews.toLocaleString("vi-VN")}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sky-300 font-medium">Khách truy cập:</span>
                  <span className="font-bold font-mono text-white">{chartPoints[hoveredChartIdx].visitors.toLocaleString("vi-VN")}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400 border-t border-slate-800/80 pt-1">
                  <span>Tỷ lệ thoát: {chartPoints[hoveredChartIdx].bounceRate}%</span>
                  <span>TB: {chartPoints[hoveredChartIdx].avgDuration}</span>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Biểu đồ 2: Cơ Cấu Nguồn & Thiết Bị (Donut & Breakdown) */}
        <GlassCard className="!p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-sky-400" />
                <span>Nguồn Lưu Lượng Chính</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">Top kênh</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Tỷ trọng các kênh đóng góp lượt truy cập vào shop</p>

            {/* List Nguồn kèm thanh tiến độ */}
            <div className="space-y-3">
              {(data?.sourceData || []).map((src, idx) => {
                const colors = ["bg-sky-400", "bg-indigo-400", "bg-emerald-400", "bg-amber-400", "bg-pink-400"];
                const color = colors[idx % colors.length];
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200 truncate max-w-[190px]" title={src.name}>
                        {src.name}
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400">{src.sessions.toLocaleString("vi-VN")}</span>
                        <span className="font-bold text-white">{src.share}%</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${src.share}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Khách mới vs Khách cũ Mini Bar */}
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Cơ cấu khách hàng:</span>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="text-emerald-400">Mới: {data?.newVsReturning?.[0]?.share || 65}%</span>
                <span className="text-blue-400">Cũ: {data?.newVsReturning?.[1]?.share || 35}%</span>
              </div>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500 rounded-l-full transition-all" style={{ width: `${data?.newVsReturning?.[0]?.share || 65}%` }} />
              <div className="h-full bg-blue-500 rounded-r-full transition-all" style={{ width: `${data?.newVsReturning?.[1]?.share || 35}%` }} />
            </div>
          </div>
        </GlassCard>
      </div>
  </>
  );
};
