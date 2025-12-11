import React, { useMemo } from "react";
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BellAlertIcon,
  CheckBadgeIcon,
  EllipsisHorizontalIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type SummaryStat = {
  title: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  accent: "amber" | "emerald";
  icon: React.ElementType;
};

type ExpenseItem = { name: string; value: number; color: string };
type BudgetItem = { name: string; used: number; total: number };
type SavingGoal = {
  name: string;
  progress: number;
  saved: number;
  target: number;
  accent: string;
};

const summaryStats: SummaryStat[] = [
  {
    title: "Tổng chi tiêu",
    value: "89,935",
    delta: "+1.01% tháng này",
    trend: "up",
    accent: "amber",
    icon: ArrowTrendingUpIcon,
  },
  {
    title: "Tổng thu nhập",
    value: "23,283.5",
    delta: "+0.49% tháng này",
    trend: "up",
    accent: "emerald",
    icon: ArrowTrendingUpIcon,
  },
];

const expenses: ExpenseItem[] = [
  { name: "Nhà cửa & Tiện ích", value: 8000000, color: "#F8C573" },
  { name: "Thực phẩm", value: 5120000, color: "#9BE7C4" },
  { name: "Chăm sóc cá nhân", value: 5380000, color: "#7CB3FF" },
  { name: "Phụ kiện", value: 4120000, color: "#F48FB1" },
  { name: "Dịch vụ khác", value: 3030000, color: "#C7D2FE" },
];

const budgets: BudgetItem[] = [
  { name: "Nhà cửa & Tiện ích", used: 3150000, total: 4500000 },
  { name: "Thực phẩm & Thiết yếu", used: 2260000, total: 4500000 },
  { name: "Chăm sóc cá nhân", used: 1890000, total: 4500000 },
  { name: "Phụ kiện", used: 1520000, total: 4500000 },
];

const savingGoals: SavingGoal[] = [
  {
    name: "Laptop mới",
    progress: 50,
    saved: 3375000,
    target: 6750000,
    accent: "#f8c573",
  },
  {
    name: "Du lịch",
    progress: 70,
    saved: 4740000,
    target: 6750000,
    accent: "#9be7c4",
  },
];

type FundRow = {
  time: string;
  momo: number;
  bank: number;
  supper: number;
  gold: number;
};

const fundRows: FundRow[] = [
  {
    time: "01/12/2025",
    momo: 1500000,
    bank: 3250000,
    supper: 2200000,
    gold: 1800000,
  },
  {
    time: "05/12/2025",
    momo: 900000,
    bank: 2000000,
    supper: 1600000,
    gold: 1450000,
  },
  {
    time: "10/12/2025",
    momo: 1250000,
    bank: 2800000,
    supper: 2100000,
    gold: 1700000,
  },
  {
    time: "14/12/2025",
    momo: 1100000,
    bank: 2600000,
    supper: 1850000,
    gold: 1500000,
  },
];

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 1,
});

const summaryAccent: Record<
  SummaryStat["accent"],
  { iconBg: string; chip: string }
> = {
  amber: {
    iconBg: "bg-amber-100 text-amber-600",
    chip: "bg-amber-50 text-amber-700",
  },
  emerald: {
    iconBg: "bg-emerald-100 text-emerald-600",
    chip: "bg-emerald-50 text-emerald-700",
  },
};

const SummaryCard: React.FC<SummaryStat> = ({
  title,
  value,
  delta,
  trend,
  accent,
  icon: Icon,
}) => {
  const accentStyle = summaryAccent[accent];
  const TrendIcon =
    trend === "up" ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;

  return (
    <div className="stats-card p-5 flex items-center justify-between gap-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          {title}
        </p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        <div
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${accentStyle.chip}`}
        >
          <TrendIcon className="h-4 w-4" />
          <span>{delta}</span>
        </div>
      </div>
      <div
        className={`h-12 w-12 rounded-2xl flex items-center justify-center ${accentStyle.iconBg}`}
      >
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
};

const BudgetRow: React.FC<BudgetItem> = ({ name, used, total }) => {
  const percent = Math.min(100, Math.round((used / total) * 100));
  const remaining = total - used;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
        <span>{name}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-slate-900"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">
        Còn lại {currencyFormatter.format(remaining)} /{" "}
        {currencyFormatter.format(total)}
      </p>
    </div>
  );
};

const GoalRing: React.FC<{ progress: number; color: string }> = ({
  progress,
  color,
}) => (
  <div className="relative h-14 w-14">
    <div
      className="absolute inset-0 rounded-full"
      style={{
        background: `conic-gradient(${color} ${progress}%, #e2e8f0 ${progress}%)`,
      }}
    />
    <div className="absolute inset-[6px] rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-xs font-semibold text-white shadow-inner shadow-black/30">
      {Math.round(progress)}%
    </div>
  </div>
);

export default function Stats() {
  const totalExpense = useMemo(
    () => expenses.reduce((sum, item) => sum + item.value, 0),
    []
  );

  return (
    <div className="stats-shell min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {summaryStats.map((item) => (
            <SummaryCard key={item.title} {...item} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="stats-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Chi tiêu hàng tháng
                </p>
                <p className="text-xs text-slate-500">
                  Tổng quan tháng hiện tại
                </p>
              </div>
            </div>

            <div className="grid items-center gap-6 lg:grid-cols-[1.1fr_1fr]">
              <div className="relative h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenses}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="60%"
                      outerRadius="85%"
                      paddingAngle={4}
                      cornerRadius={12}
                      stroke="none"
                    >
                      {expenses.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) =>
                        currencyFormatter.format(value)
                      }
                      contentStyle={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        color: "#0f172a",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {currencyFormatter.format(totalExpense)}
                    </p>
                    <p className="text-sm text-slate-500">Tổng</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-[0_14px_40px_-28px_rgba(0,0,0,0.7)] backdrop-blur-sm">
                <div className="grid grid-cols-12 text-xs font-semibold text-white/70">
                  <span className="col-span-6">Nhãn</span>
                  <span className="col-span-4 text-right">Giá trị</span>
                  <span className="col-span-2 text-right">%</span>
                </div>
                {expenses.map((item) => {
                  const percent = (item.value / totalExpense) * 100;
                  return (
                    <div
                      key={item.name}
                      className="grid grid-cols-12 items-center rounded-xl px-3 py-2 transition-colors hover:bg-white/5"
                    >
                      <div className="col-span-6 flex items-center gap-2 text-sm font-semibold text-white">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </div>
                      <div className="col-span-4 text-right text-sm font-semibold text-white">
                        {currencyFormatter.format(item.value)}
                      </div>
                      <div className="col-span-2 text-right text-xs text-white/70">
                        {percentFormatter.format(percent)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_16px_42px_-26px_rgba(0,0,0,0.75)] space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Dòng tiền</p>
                <span className="text-xs text-white/60">
                  Tổng hợp theo nguồn
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/5 text-white/70 text-xs uppercase tracking-[0.08em]">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">
                        Thời gian
                      </th>
                      <th className="px-3 py-2 text-right font-semibold">
                        Momo
                      </th>
                      <th className="px-3 py-2 text-right font-semibold">
                        Ngân Hàng
                      </th>
                      <th className="px-3 py-2 text-right font-semibold">
                        Supper Sinh Lời
                      </th>
                      <th className="px-3 py-2 text-right font-semibold">
                        Vàng
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-white">
                    {fundRows.map((row, idx) => (
                      <tr
                        key={`${row.time}-${idx}`}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-3 py-2 font-semibold">{row.time}</td>
                        <td className="px-3 py-2 text-right text-white/90">
                          {currencyFormatter.format(row.momo)}
                        </td>
                        <td className="px-3 py-2 text-right text-white/90">
                          {currencyFormatter.format(row.bank)}
                        </td>
                        <td className="px-3 py-2 text-right text-white/90">
                          {currencyFormatter.format(row.supper)}
                        </td>
                        <td className="px-3 py-2 text-right text-white/90">
                          {currencyFormatter.format(row.gold)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="stats-card stats-alert p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border border-amber-100">
                <BellAlertIcon className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  Chi tiêu thực phẩm tăng 20% trong tháng này
                </p>
                <p className="text-xs text-amber-700">
                  Xem lại hạn mức để tránh vượt ngân sách.
                </p>
              </div>
            </div>

            <div className="stats-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">
                  Ngân sách
                </p>
                <EllipsisHorizontalIcon className="h-5 w-5 text-slate-400" />
              </div>
              <div className="space-y-3">
                {budgets.map((budget) => (
                  <BudgetRow key={budget.name} {...budget} />
                ))}
              </div>
              <button
                type="button"
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.45)] hover:bg-slate-800 transition-colors"
              >
                Tạo ngân sách
              </button>
            </div>

            <div className="stats-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">
                  Mục tiêu tiết kiệm
                </p>
                <CheckBadgeIcon className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="space-y-3">
                {savingGoals.map((goal) => (
                  <div
                    key={goal.name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 shadow-[0_12px_32px_-26px_rgba(0,0,0,0.65)] backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-3">
                      <GoalRing progress={goal.progress} color={goal.accent} />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {goal.name}
                        </p>
                        <p className="text-xs text-white/70">
                          {currencyFormatter.format(goal.saved)} /{" "}
                          {currencyFormatter.format(goal.target)}
                        </p>
                      </div>
                    </div>
                    <RocketLaunchIcon className="h-5 w-5 text-white/60" />
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="w-full rounded-xl bg-white/10 py-3 text-sm font-semibold text-white border border-white/15 hover:bg-white/15 transition-colors shadow-[0_12px_30px_-24px_rgba(0,0,0,0.65)]"
              >
                Đặt mục tiêu mới
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
