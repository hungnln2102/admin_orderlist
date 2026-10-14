import React, { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarClock, CircleCheck, CircleDollarSign, ReceiptText, Wallet } from "lucide-react";
import { BreakEvenMetrics, DailyBreakEvenStats, NetWorthMetrics } from "../types";

interface Props {
  breakEven: BreakEvenMetrics;
  dailyBreakEven: DailyBreakEvenStats;
  netWorth: NetWorthMetrics;
  month: string;
}

const formatVND = (value: number) => `${Math.round(value).toLocaleString("vi-VN")} ₫`;
const formatCompact = (value: number) => {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m ₫`;
  if (absolute >= 1_000) return `${Math.round(value / 1_000)}k ₫`;
  return formatVND(value);
};

export const FinanceOverviewPanel: React.FC<Props> = ({ breakEven, dailyBreakEven, netWorth, month }) => {
  const currentDay = dailyBreakEven.currentDay || new Date().getDate();
  const today = dailyBreakEven.chartData.find((item) => item.day === currentDay);
  const remainingToday = Math.max(0, (today?.todayRequired ?? dailyBreakEven.requiredForToday) - (today?.todayProfit ?? dailyBreakEven.todayProfit));
  const progress = Math.max(0, Math.min(100, breakEven.breakEvenPercent));
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  const days = useMemo(() => dailyBreakEven.chartData.slice(-14), [dailyBreakEven.chartData]);
  const maxProfit = Math.max(1, ...days.map((item) => Math.abs(item.todayProfit)));

  return (
    <section className="rounded-2xl border border-slate-800 bg-[#0b1422] shadow-[0_18px_50px_-34px_rgba(0,0,0,0.9)]" aria-labelledby="finance-overview-title">
      <header className="flex flex-col gap-3 border-b border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"><CircleDollarSign className="h-4 w-4 text-cyan-300" /> Tổng quan tài chính</div>
          <h2 id="finance-overview-title" className="mt-1 text-lg font-semibold tracking-tight text-white">Tình hình tháng {monthLabel}</h2>
        </div>
        <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${breakEven.isBreakEvenPassed ? "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-300" : "border-amber-400/25 bg-amber-400/[0.07] text-amber-200"}`}><span className={`h-1.5 w-1.5 rounded-full ${breakEven.isBreakEvenPassed ? "bg-emerald-400" : "bg-amber-400"}`} />{breakEven.isBreakEvenPassed ? "Đã vượt điểm hòa vốn" : "Chưa đạt điểm hòa vốn"}</div>
      </header>

      <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
        <div className="border-b border-slate-800 p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-xs text-slate-500">Lợi nhuận ròng</div><div className={`mt-1 text-3xl font-semibold tracking-tight ${breakEven.netProfit >= 0 ? "text-white" : "text-rose-300"}`}>{formatVND(breakEven.netProfit)}</div></div><div className="text-right"><div className="text-xs text-slate-500">Mục tiêu hòa vốn</div><div className="mt-1 font-mono text-sm text-slate-300">{formatCompact(breakEven.breakEvenTarget)}</div></div></div>
          <div className="mt-5"><div className="mb-2 flex justify-between text-[11px] text-slate-500"><span>Tiến độ hòa vốn</span><span className="font-mono text-slate-300">{progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${breakEven.isBreakEvenPassed ? "bg-emerald-400" : "bg-cyan-400"}`} style={{ width: `${progress}%` }} /></div></div>
          <div className="mt-5 grid grid-cols-3 divide-x divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/30"><div className="p-3"><div className="text-[10px] text-slate-500">Doanh thu</div><div className="mt-1 font-mono text-xs text-slate-200">{formatCompact(breakEven.shopRevenue)}</div></div><div className="p-3 pl-4"><div className="text-[10px] text-slate-500">Giá vốn</div><div className="mt-1 font-mono text-xs text-slate-200">{formatCompact(breakEven.shopCogs)}</div></div><div className="p-3 pl-4"><div className="text-[10px] text-slate-500">Đơn hàng</div><div className="mt-1 font-mono text-xs text-slate-200">{breakEven.shopOrdersCount.toLocaleString("vi-VN")}</div></div></div>
        </div>

        <div className="p-4 sm:p-5"><div className="flex items-center justify-between"><div><div className="text-xs text-slate-500">Việc cần xử lý hôm nay</div><div className="mt-1 text-base font-semibold text-white">{remainingToday > 0 ? "Bù thêm lợi nhuận" : "Đã đạt chỉ tiêu"}</div></div><CalendarClock className="h-5 w-5 text-cyan-300" /></div><div className={`mt-4 rounded-xl border p-3 ${remainingToday > 0 ? "border-amber-400/20 bg-amber-400/[0.05]" : "border-emerald-400/20 bg-emerald-400/[0.05]"}`}><div className="text-[11px] text-slate-500">{remainingToday > 0 ? "Còn thiếu trong ngày" : "Phần dư hôm nay"}</div><div className={`mt-1 text-xl font-semibold ${remainingToday > 0 ? "text-amber-200" : "text-emerald-300"}`}>{remainingToday > 0 ? formatVND(remainingToday) : formatVND(Math.max(0, (today?.todayProfit ?? 0) - (today?.todayRequired ?? 0)))}</div></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-slate-950/40 p-3"><div className="text-slate-500">Định mức</div><div className="mt-1 font-mono text-slate-200">{formatCompact(today?.todayRequired ?? dailyBreakEven.requiredForToday)}</div></div><div className="rounded-lg bg-slate-950/40 p-3"><div className="text-slate-500">Đã ghi nhận</div><div className="mt-1 font-mono text-cyan-200">{formatCompact(today?.todayProfit ?? dailyBreakEven.todayProfit)}</div></div></div></div>
      </div>

      <div className="grid border-t border-slate-800 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="border-b border-slate-800 p-4 sm:p-5 lg:border-b-0 lg:border-r"><div className="flex items-center justify-between"><div><div className="text-sm font-semibold text-white">Dòng tiền 14 ngày gần nhất</div><div className="mt-1 text-xs text-slate-500">Lợi nhuận gộp theo ngày</div></div><ReceiptText className="h-4 w-4 text-slate-500" /></div><div className="mt-5 flex h-28 items-end gap-1.5">{days.map((item) => { const height = Math.max(8, Math.round((Math.abs(item.todayProfit) / maxProfit) * 100)); const positive = item.todayProfit >= 0; return <div key={item.day} className="group flex h-full flex-1 flex-col justify-end" title={`Ngày ${item.day}: ${formatVND(item.todayProfit)}`}><div className={`w-full rounded-t-md transition-all group-hover:opacity-80 ${item.isFuture ? "bg-slate-700" : positive ? "bg-cyan-400/75" : "bg-rose-400/70"}`} style={{ height: `${item.isFuture ? 8 : height}%` }} /></div>; })}</div><div className="mt-2 flex justify-between text-[10px] font-mono text-slate-600"><span>N{days[0]?.day || 1}</span><span>N{days.at(-1)?.day || currentDay}</span></div></div>
        <div className="p-4 sm:p-5"><div className="text-sm font-semibold text-white">Tóm tắt tài sản</div><div className="mt-4 space-y-3"><div className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-400"><Wallet className="h-4 w-4 text-emerald-300" /> Tài sản ròng</span><span className={`font-mono ${netWorth.netWorth >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatCompact(netWorth.netWorth)}</span></div><div className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-400"><ArrowUpRight className="h-4 w-4 text-cyan-300" /> Tổng tài sản</span><span className="font-mono text-slate-200">{formatCompact(netWorth.totalAssets)}</span></div><div className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-400"><ArrowDownRight className="h-4 w-4 text-rose-300" /> Tổng nghĩa vụ</span><span className="font-mono text-rose-300">{formatCompact(netWorth.totalLiabilities)}</span></div></div><div className="mt-5 flex items-center gap-2 border-t border-slate-800 pt-4 text-xs text-slate-500"><CircleCheck className="h-4 w-4 text-emerald-300" />{netWorth.totalAssets > 0 ? `${Math.round((netWorth.totalLiabilities / netWorth.totalAssets) * 100)}% tài sản đang gắn với nghĩa vụ` : "Chưa có dữ liệu tài sản"}</div></div>
      </div>
    </section>
  );
};
