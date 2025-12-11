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
    title: "Total expense",
    value: "89,935",
    delta: "+1.01% this month",
    trend: "up",
    accent: "amber",
    icon: ArrowTrendingUpIcon,
  },
  {
    title: "Total income",
    value: "23,283.5",
    delta: "+0.49% this month",
    trend: "up",
    accent: "emerald",
    icon: ArrowTrendingUpIcon,
  },
];

const expenses: ExpenseItem[] = [
  { name: "Home & Utilities", value: 8000000, color: "#F8C573" },
  { name: "Groceries", value: 5120000, color: "#9BE7C4" },
  { name: "Personal Care", value: 5380000, color: "#7CB3FF" },
  { name: "Accessories", value: 4120000, color: "#F48FB1" },
  { name: "Other Services", value: 3030000, color: "#C7D2FE" },
];

const budgets: BudgetItem[] = [
  { name: "Home & Utilities", used: 3150000, total: 4500000 },
  { name: "Groceries & Essentials", used: 2260000, total: 4500000 },
  { name: "Personal Care", used: 1890000, total: 4500000 },
  { name: "Accessories", used: 1520000, total: 4500000 },
];

const savingGoals: SavingGoal[] = [
  { name: "New Laptop", progress: 50, saved: 3375000, target: 6750000, accent: "#f8c573" },
  { name: "Vacation", progress: 70, saved: 4740000, target: 6750000, accent: "#9be7c4" },
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
  const TrendIcon = trend === "up" ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;

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
        Remaining {currencyFormatter.format(remaining)} /{" "}
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
    <div className="absolute inset-[6px] rounded-full bg-white flex items-center justify-center text-xs font-semibold text-slate-900">
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Welcome Back, Marci</h1>
            <p className="text-sm text-slate-500">
              Here is the information about all your orders.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="stats-chip flex items-center gap-2 px-3 py-2 border border-slate-200">
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
              <input
                className="stats-input text-sm text-slate-700 placeholder:text-slate-400"
                placeholder="Search"
                type="text"
              />
            </div>
            <button
              type="button"
              className="stats-chip flex h-10 w-10 items-center justify-center border border-slate-200"
              aria-label="Notifications"
            >
              <BellAlertIcon className="h-5 w-5 text-slate-500" />
            </button>
            <div className="stats-chip flex items-center gap-2 px-3 py-2 border border-slate-200">
              <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                M
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Marci Fumons</p>
                <p className="text-[11px] text-slate-500">Admin</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {summaryStats.map((item) => (
            <SummaryCard key={item.title} {...item} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="stats-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Monthly Expenses</p>
                <p className="text-xs text-slate-500">Current month overview</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                Monthly
                <EllipsisHorizontalIcon className="h-4 w-4 text-slate-400" />
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
                      stroke="#f6f7fb"
                      strokeWidth={6}
                    >
                      {expenses.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => currencyFormatter.format(value)}
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
                    <p className="text-sm text-slate-500">Total</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div className="grid grid-cols-12 text-xs font-semibold text-slate-500">
                  <span className="col-span-6">Label</span>
                  <span className="col-span-4 text-right">Value</span>
                  <span className="col-span-2 text-right">%</span>
                </div>
                {expenses.map((item) => {
                  const percent = (item.value / totalExpense) * 100;
                  return (
                    <div
                      key={item.name}
                      className="grid grid-cols-12 items-center rounded-xl px-3 py-2 hover:bg-white"
                    >
                      <div className="col-span-6 flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </div>
                      <div className="col-span-4 text-right text-sm font-semibold text-slate-900">
                        {currencyFormatter.format(item.value)}
                      </div>
                      <div className="col-span-2 text-right text-xs text-slate-600">
                        {percentFormatter.format(percent)}%
                      </div>
                    </div>
                  );
                })}
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
                  Your grocery spending is up 20% this month
                </p>
                <p className="text-xs text-amber-700">
                  Review your limits to avoid going over budget.
                </p>
              </div>
            </div>

            <div className="stats-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Budgets</p>
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
                Create budget
              </button>
            </div>

            <div className="stats-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Saving Goal</p>
                <CheckBadgeIcon className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="space-y-3">
                {savingGoals.map((goal) => (
                  <div
                    key={goal.name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <GoalRing progress={goal.progress} color={goal.accent} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{goal.name}</p>
                        <p className="text-xs text-slate-500">
                          {currencyFormatter.format(goal.saved)} /{" "}
                          {currencyFormatter.format(goal.target)}
                        </p>
                      </div>
                    </div>
                    <RocketLaunchIcon className="h-5 w-5 text-slate-400" />
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Set new goal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
