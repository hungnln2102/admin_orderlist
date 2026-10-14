import React, { useMemo, useState } from "react";
import { Activity, CalendarDays, Gauge, Target, Zap } from "lucide-react";
import { BreakEvenMetrics, DailyBreakEvenPoint, DailyBreakEvenStats } from "../types";

interface Props {
  breakEven: BreakEvenMetrics;
  dailyBreakEven: DailyBreakEvenStats;
  month: string;
}

const formatVND = (value: number) => `${Math.round(value).toLocaleString("vi-VN")} ₫`;
const formatCompactVND = (value: number) => {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m ₫`;
  if (absolute >= 1_000) return `${Math.round(value / 1_000)}k ₫`;
  return `${Math.round(value).toLocaleString("vi-VN")} ₫`;
};

const getSmoothPath = (points: Array<{ x: number; y: number }>) => {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x},${point.y}`;
    const previous = points[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX},${previous.y} ${controlX},${point.y} ${point.x},${point.y}`;
  }, "");
};

export const SmartForecastBreakEvenSection: React.FC<Props> = ({ breakEven, dailyBreakEven, month }) => {
  const { chartData, dailyBurden, breakEvenDay, daysInMonth, currentDay: actualCurrentDay } = dailyBreakEven;
  const currentDay = actualCurrentDay || Math.min(daysInMonth, new Date().getDate());
  const [selectedDay, setSelectedDay] = useState<DailyBreakEvenPoint | null>(() => chartData.find((item) => item.day === currentDay) || chartData[0] || null);

  const metrics = useMemo(() => {
    const elapsedDays = Math.max(1, chartData.filter((item) => !item.isFuture).length);
    const avgProfitPerDay = Math.max(0, breakEven.shopGrossProfit / elapsedDays);
    const avgOrderProfit = breakEven.shopOrdersCount > 0 ? breakEven.shopGrossProfit / breakEven.shopOrdersCount : 250000;
    const projectedDay = breakEven.isBreakEvenPassed
      ? breakEvenDay || currentDay
      : avgProfitPerDay > 0
        ? Math.min(daysInMonth, currentDay + Math.ceil(Math.max(0, breakEven.breakEvenTarget - breakEven.shopGrossProfit) / avgProfitPerDay))
        : null;
    const today = chartData.find((item) => item.day === currentDay);
    const todayRequired = today?.todayRequired ?? dailyBurden;
    const todayProfit = today?.todayProfit ?? 0;
    const remainingForToday = Math.max(0, todayRequired - todayProfit);
    return {
      avgProfitPerDay,
      avgOrderProfit,
      projectedDay,
      todayRequired,
      todayProfit,
      remainingForToday,
      ordersNeeded: remainingForToday > 0 ? Math.max(1, Math.ceil(remainingForToday / (avgOrderProfit || 250000))) : 0,
      pacingPercent: breakEven.breakEvenTarget > 0 ? Math.round((avgProfitPerDay / (breakEven.breakEvenTarget / Math.max(1, daysInMonth))) * 100) : 0,
    };
  }, [breakEven, breakEvenDay, chartData, currentDay, dailyBurden, daysInMonth]);

  const chart = useMemo(() => {
    if (!chartData.length) return { points: [], zeroY: 150, min: -1, max: 1 };
    const values = chartData.map((item) => {
      if (item.day <= currentDay) return item.cumulativeProfit - breakEven.breakEvenTarget;
      return breakEven.shopGrossProfit + (item.day - currentDay) * metrics.avgProfitPerDay - breakEven.breakEvenTarget;
    });
    let min = Math.min(0, ...values);
    let max = Math.max(0, ...values);
    const padding = Math.max(1, (max - min) * 0.16);
    min -= padding;
    max += padding;
    const width = 920;
    const height = 300;
    const left = 18;
    const top = 20;
    const chartWidth = width - 36;
    const chartHeight = height - 42;
    const zeroY = top + chartHeight - ((0 - min) / (max - min || 1)) * chartHeight;
    const points = chartData.map((item, index) => {
      const value = values[index];
      return {
        ...item,
        x: left + (index / Math.max(1, chartData.length - 1)) * chartWidth,
        y: top + chartHeight - ((value - min) / (max - min || 1)) * chartHeight,
        value,
      };
    });
    return { points, zeroY, min, max };
  }, [breakEven.breakEvenTarget, breakEven.shopGrossProfit, chartData, currentDay, metrics.avgProfitPerDay]);

  const linePath = getSmoothPath(chart.points);
  const areaPath = linePath ? `${linePath} L ${chart.points.at(-1)?.x},${chart.zeroY} L ${chart.points[0]?.x},${chart.zeroY} Z` : "";
  const progress = Math.min(100, Math.max(0, breakEven.breakEvenPercent));
  const isPassed = breakEven.isBreakEvenPassed;
  const selectedIsFuture = selectedDay?.isFuture;
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-[#08101f] p-3.5 shadow-[0_24px_70px_-35px_rgba(0,0,0,0.9)] sm:p-5 lg:p-6" aria-labelledby="forecast-heading">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(20,184,166,0.12),transparent_32%),radial-gradient(circle_at_0%_100%,rgba(14,165,233,0.09),transparent_32%)]" />
      <div className="relative space-y-4">
        <header className="flex flex-col gap-4 border-b border-slate-800/80 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80"><Activity className="h-4 w-4" /> Financial command center</div>
            <h2 id="forecast-heading" className="text-xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">Bạn đang tiến gần điểm hòa vốn đến đâu?</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Dòng tiền thực tế và nhịp lợi nhuận dự phóng cho {monthLabel}. Tập trung vào việc cần làm hôm nay thay vì đọc quá nhiều chỉ số cùng lúc.</p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 ${isPassed ? "border-emerald-400/30 bg-emerald-400/[0.08]" : "border-amber-400/30 bg-amber-400/[0.08]"}`}>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><span className={`h-2 w-2 rounded-full ${isPassed ? "bg-emerald-400" : "bg-amber-400"}`} /> Trạng thái tháng</div>
            <div className={`mt-1 text-lg font-semibold ${isPassed ? "text-emerald-300" : "text-amber-200"}`}>{isPassed ? "Đã hòa vốn" : "Đang tạo đà"}</div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-2xl border border-slate-800 bg-[#0c1729] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><div className="text-xs font-medium text-slate-400">Lợi nhuận ròng hiện tại</div><div className={`mt-2 text-3xl font-semibold tracking-[-0.05em] ${isPassed ? "text-emerald-300" : "text-white"}`}>{formatVND(breakEven.netProfit)}</div></div>
              <div className="text-right"><div className="text-xs text-slate-500">Mục tiêu hòa vốn</div><div className="mt-2 font-mono text-sm font-semibold text-slate-200">{formatVND(breakEven.breakEvenTarget)}</div></div>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full transition-all ${isPassed ? "bg-emerald-400" : "bg-cyan-400"}`} style={{ width: `${progress}%` }} /></div>
            <div className="mt-3 flex justify-between text-xs text-slate-500"><span>{progress}% hoàn thành</span><span>{breakEven.remainingToBreakEven > 0 ? `Còn ${formatCompactVND(breakEven.remainingToBreakEven)}` : "Vượt mục tiêu"}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-slate-800 bg-[#0c1729] p-4"><div className="flex items-center gap-2 text-xs text-slate-400"><Target className="h-4 w-4 text-cyan-300" /> Hòa vốn dự kiến</div><div className="mt-3 text-xl font-semibold text-white">{metrics.projectedDay ? `Ngày ${metrics.projectedDay}` : "Chưa đủ dữ liệu"}</div><div className="mt-1 text-xs text-slate-500">Theo tốc độ hiện tại</div></div>
            <div className="rounded-2xl border border-slate-800 bg-[#0c1729] p-4"><div className="flex items-center gap-2 text-xs text-slate-400"><Gauge className="h-4 w-4 text-violet-300" /> Nhịp so với định mức</div><div className="mt-3 text-xl font-semibold text-white">{metrics.pacingPercent}%</div><div className="mt-1 text-xs text-slate-500">{metrics.pacingPercent >= 100 ? "Đang chạy đúng nhịp" : "Cần tăng tốc"}</div></div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.65fr_0.75fr]">
          <div className="min-w-0 rounded-2xl border border-slate-800 bg-[#0c1729] p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-semibold text-white">Quỹ đạo lợi nhuận</div><div className="mt-1 text-xs text-slate-500">Thực tế đến hôm nay · dự phóng sau đó</div></div><div className="flex items-center gap-4 text-[11px] text-slate-400"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-cyan-400" /> Thực tế</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-300" /> Dự phóng</span></div></div>
            <div className="overflow-hidden rounded-xl bg-[#091321] px-1 pt-2"><svg viewBox="0 0 920 300" className="h-[230px] w-full sm:h-[270px]" role="img" aria-label="Biểu đồ quỹ đạo lợi nhuận và điểm hòa vốn"><defs><linearGradient id="forecast-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity="0.22" /><stop offset="100%" stopColor="#22d3ee" stopOpacity="0" /></linearGradient></defs><line x1="18" x2="902" y1={chart.zeroY} y2={chart.zeroY} stroke="#64748b" strokeDasharray="5 7" strokeOpacity="0.55" /><text x="22" y={chart.zeroY - 8} fill="#94a3b8" fontSize="11">Hòa vốn</text><path d={areaPath} fill="url(#forecast-area)" /><path d={linePath} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />{chart.points.map((point) => <circle key={point.day} cx={point.x} cy={point.y} r={point.day === currentDay ? 6 : 2.5} fill={point.isFuture ? "#c4b5fd" : "#22d3ee"} stroke={point.day === currentDay ? "#f8fafc" : "none"} strokeWidth="2" />)}<line x1={chart.points.find((point) => point.day === currentDay)?.x || 0} x2={chart.points.find((point) => point.day === currentDay)?.x || 0} y1="20" y2="278" stroke="#22d3ee" strokeDasharray="3 7" strokeOpacity="0.45" /></svg></div>
            <div className="mt-3 flex justify-between px-1 text-[10px] font-mono text-slate-500"><span>N1</span><span>N{Math.ceil(daysInMonth / 2)}</span><span>N{daysInMonth}</span></div>
          </div>

          <aside className="rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.06] p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold text-white"><Zap className="h-4 w-4 text-cyan-300" /> Việc cần làm hôm nay</div><span className="rounded-full border border-cyan-400/25 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">Live</span></div><div className="mt-5 text-sm text-slate-300">{metrics.remainingForToday > 0 ? "Bạn cần bổ sung thêm lợi nhuận để giữ đúng nhịp hòa vốn." : "Hôm nay đã vượt chỉ tiêu. Phần dư đang làm nhẹ gánh cho các ngày sau."}</div><div className="mt-5 rounded-xl border border-slate-700/80 bg-[#091321] p-4"><div className="text-xs text-slate-500">Mục tiêu còn lại hôm nay</div><div className={`mt-2 text-xl font-semibold ${metrics.remainingForToday > 0 ? "text-amber-200" : "text-emerald-300"}`}>{metrics.remainingForToday > 0 ? formatVND(metrics.remainingForToday) : "Đã đạt"}</div><div className="mt-1 text-xs text-slate-500">xấp xỉ {metrics.ordersNeeded} đơn theo lợi nhuận bình quân</div></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#091321] p-3"><div className="text-[11px] text-slate-500">Định mức</div><div className="mt-1 font-mono text-xs text-slate-200">{formatCompactVND(metrics.todayRequired)}</div></div><div className="rounded-xl bg-[#091321] p-3"><div className="text-[11px] text-slate-500">Đã ghi nhận</div><div className="mt-1 font-mono text-xs text-cyan-200">{formatCompactVND(metrics.todayProfit)}</div></div></div></aside>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0c1729] p-4 sm:p-5"><div className="flex flex-col gap-3 border-b border-slate-800/80 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-semibold text-white"><CalendarDays className="h-4 w-4 text-cyan-300" /> Nhịp độ từng ngày</div><div className="mt-1 text-xs text-slate-500">Chọn một ngày để xem dòng tiền chi tiết</div></div><div className="flex items-center gap-3 text-[11px] text-slate-500"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Đạt</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" /> Thiếu</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-600" /> Chưa tới</span></div></div><div className="mt-4 flex gap-2 overflow-x-auto pb-2" role="list" aria-label="Các ngày trong tháng">{chartData.map((item) => { const isToday = item.day === currentDay; const isSelected = selectedDay?.day === item.day; const positive = item.isDebtFreeToday; return <button key={item.day} type="button" onClick={() => setSelectedDay(item)} aria-pressed={isSelected} className={`min-w-[62px] rounded-xl border px-2 py-3 text-center transition-all ${isSelected ? "border-cyan-300 bg-cyan-400/15 text-white shadow-lg shadow-cyan-950/30" : item.isFuture ? "border-slate-800 bg-[#091321] text-slate-500 hover:border-slate-600" : positive ? "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-200 hover:border-emerald-300/60" : "border-rose-400/25 bg-rose-400/[0.05] text-rose-200 hover:border-rose-300/60"}`}><div className="text-[10px] font-mono text-slate-500">N{item.day}</div><div className="mt-1 text-xs font-semibold">{item.isFuture ? "—" : positive ? "Đạt" : "Thiếu"}</div>{isToday && <div className="mx-auto mt-2 h-1 w-5 rounded-full bg-cyan-300" />}</button>; })}</div>{selectedDay && <div className="mt-4 grid gap-4 rounded-xl border border-slate-700/80 bg-[#091321] p-4 sm:grid-cols-[1fr_2fr] sm:items-center"><div><div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Đang xem</div><div className="mt-1 flex items-center gap-2 text-lg font-semibold text-white">Ngày {selectedDay.day} <span className="text-xs font-normal text-cyan-300">{selectedDay.dateStr}</span>{selectedDay.day === currentDay && <span className="rounded-full bg-cyan-400/15 px-2 py-1 text-[10px] font-semibold text-cyan-200">Hôm nay</span>}</div><div className="mt-2 text-xs text-slate-500">{selectedIsFuture ? "Dữ liệu dự phóng" : `${selectedDay.ordersCount} đơn · ${formatCompactVND(selectedDay.dailyRevenue)} doanh thu`}</div></div><div className="grid grid-cols-2 gap-2 lg:grid-cols-4"><div className="rounded-lg bg-slate-900/70 p-3"><div className="text-[10px] text-slate-500">Nợ mang sang</div><div className="mt-1 font-mono text-xs text-rose-300">{formatCompactVND(selectedDay.previousDebt)}</div></div><div className="rounded-lg bg-slate-900/70 p-3"><div className="text-[10px] text-slate-500">Cần đạt</div><div className="mt-1 font-mono text-xs text-amber-200">{formatCompactVND(selectedDay.todayRequired)}</div></div><div className="rounded-lg bg-slate-900/70 p-3"><div className="text-[10px] text-slate-500">Lãi gộp</div><div className="mt-1 font-mono text-xs text-cyan-200">{formatCompactVND(selectedDay.todayProfit)}</div></div><div className="rounded-lg bg-slate-900/70 p-3"><div className="text-[10px] text-slate-500">Số dư cuối ngày</div><div className={`mt-1 font-mono text-xs ${selectedDay.rollingBalance >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{selectedDay.rollingBalance >= 0 ? "+" : ""}{formatCompactVND(selectedDay.rollingBalance)}</div></div></div></div>}</div>
      </div>
    </section>
  );
};
