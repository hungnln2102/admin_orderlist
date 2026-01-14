import React, { useMemo } from "react";
import { RocketLaunchIcon } from "@heroicons/react/24/outline";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import type { WalletColumn, WalletRow } from "../hooks/useWalletBalances";

interface Budget {
  name: string;
  used: number;
  total: number;
}

interface Goal {
  name: string;
  progress: number;
  saved: number;
  target: number;
  accent: string;
}

interface Props {
  budgets: Budget[];
  savingGoals: Goal[];
  currencyFormatter: Intl.NumberFormat;
  walletColumns: WalletColumn[];
  walletRows: WalletRow[];
  goldValue?: number | null;
}

const COLORS = ["#F8C573", "#9BE7C4", "#7CB3FF", "#F48FB1", "#C7D2FE", "#A5B4FC", "#F9A8D4"];

const ExpenseBreakdownChart: React.FC<{
  budgets: Budget[];
  walletColumns: WalletColumn[];
  walletRows: WalletRow[];
  currencyFormatter: Intl.NumberFormat;
  goldValue?: number | null;
}> = ({ budgets, walletColumns, walletRows, currencyFormatter, goldValue }) => {
  const latestWalletRow = walletRows?.[0];

  const data = useMemo(() => {
    const goldEntry =
      goldValue && goldValue > 0
        ? [
            {
              name: "Vàng (quy VND)",
              value: goldValue,
              color: "#FBBF24",
            },
          ]
        : [];

    if (latestWalletRow) {
      const walletData = walletColumns
        .filter((col) => {
          const assetCode = String(col.assetCode || "").trim().toUpperCase();
          const name = String(col.name || "").toLowerCase();
          if (name.includes("hana")) return false;
          if (assetCode && assetCode !== "VND") return false;
          return true;
        })
        .map((col, idx) => ({
          name: col.name || col.field,
          value: Math.max(0, Number(latestWalletRow.values[col.field] || 0)),
          color: COLORS[idx % COLORS.length],
        }))
        .filter((item) => item.value > 0);
      if (walletData.length) return [...walletData, ...goldEntry];
    }

    return [
      ...budgets
        .map((item, idx) => ({
          name: item.name,
          value: Math.max(0, item.used),
          color: COLORS[idx % COLORS.length],
        }))
        .filter((item) => item.value > 0),
      ...goldEntry,
    ];
  }, [budgets, walletColumns, latestWalletRow, goldValue]);

  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  const renderTooltip = ({ payload }: { payload?: Payload<number, string>[] }) => {
    if (!payload || payload.length === 0) return null;
    const item = payload[0];
    const value = Number(item?.value || 0);
    const percent = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
      <div className="rounded-lg border border-white/10 bg-slate-900/90 px-3 py-2 text-xs text-white shadow-lg">
        <div className="font-semibold">{item?.name}</div>
        <div>{currencyFormatter.format(value)}</div>
        <div className="text-white/70">{percent}%</div>
      </div>
    );
  };

  return (
    <div className="relative h-72 w-full">
      <div className="absolute inset-0 rounded-2xl border border-white/20 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 shadow-inner shadow-slate-900/50" />
      <div className="relative z-10 flex h-full w-full items-center justify-center text-white/70">
        {data.length === 0 ? (
          <div className="text-sm">Chưa có dữ liệu chi tiêu</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={75} outerRadius={100}>
                  {data.map((entry, idx) => (
                    <Cell key={`${entry.name}-${idx}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={renderTooltip} />
              </PieChart>
            </ResponsiveContainer>
            {total > 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-xs uppercase tracking-wide text-white/60">Tổng chi</div>
                  <div className="text-lg font-bold">{currencyFormatter.format(total)}</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const BudgetsGoals: React.FC<Props> = ({
  budgets,
  savingGoals,
  currencyFormatter,
  walletColumns,
  walletRows,
  goldValue,
}) => {
  const totals = useMemo(() => {
    const totalSaved = savingGoals.reduce((sum, goal) => sum + (Number(goal.saved) || 0), 0);
    const totalTarget = savingGoals.reduce((sum, goal) => sum + (Number(goal.target) || 0), 0);
    const totalRemaining = Math.max(0, totalTarget - totalSaved);
    const progress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
    return {
      totalSaved,
      totalTarget,
      totalRemaining,
      progress: Math.min(100, Math.max(0, progress)),
    };
  }, [savingGoals]);
  const milestones = useMemo(() => {
    if (totals.totalTarget <= 0) return [];
    let acc = 0;
    return savingGoals.map((goal, index) => {
      acc += Number(goal.target) || 0;
      const pos = (acc / totals.totalTarget) * 100;
      const clamped = Math.min(100, Math.max(0, pos));
      return { index: index + 1, position: clamped };
    });
  }, [savingGoals, totals.totalTarget]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
      <div className="rounded-3xl bg-white/70 p-6 space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Chi tiêu hàng tháng</p>
            <p className="text-xs text-white/70">Tổng quan tháng hiện tại</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-indigo-500/30 px-3 py-1 text-xs font-semibold text-white shadow-inner shadow-indigo-900/30">
            <RocketLaunchIcon className="h-4 w-4" />
            <span>Đang theo dõi</span>
          </div>
        </div>

        <ExpenseBreakdownChart
          budgets={budgets}
          walletColumns={walletColumns}
          walletRows={walletRows}
          currencyFormatter={currencyFormatter}
          goldValue={goldValue}
        />
      </div>

      <div className="space-y-4">
        <div className="space-y-4 rounded-3xl bg-white/70 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Mục tiêu tiết kiệm</p>
              <p className="text-xs text-white/70">Theo dõi tiến độ theo từng hàng mục</p>
            </div>
            <RocketLaunchIcon className="h-5 w-5 text-white/70" />
          </div>

          <div className="rounded-2xl border border-white/30 bg-white/60 p-4 shadow-[0_16px_32px_-28px_rgba(0,0,0,0.4)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/70">Tổng quan</p>
                <p className="text-2xl font-semibold text-white">
                  {currencyFormatter.format(totals.totalSaved)}
                </p>
                <p className="text-xs text-white/70">
                  {currencyFormatter.format(totals.totalTarget)} mục tiêu ? {savingGoals.length} hạng mục
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/60">Cần lại</p>
                <p className="text-sm font-semibold text-white">
                  {currencyFormatter.format(totals.totalRemaining)}
                </p>
              </div>
            </div>
            <div className="mt-3 relative h-6">
              <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 via-rose-300 to-emerald-200 shadow-[0_0_14px_rgba(251,191,36,0.55)]"
                  style={{ width: `${totals.progress}%` }}
                />
              </div>
              {milestones.map((milestone) => (
                <div
                  key={`milestone-${milestone.index}`}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${milestone.position}%` }}
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/50 bg-slate-900/80 text-[10px] font-semibold text-white shadow-[0_8px_16px_-12px_rgba(0,0,0,0.55)]">
                    {milestone.index}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-white/70">
              <span>{Math.round(totals.progress)}%</span>
              <span>Đã đạt {currencyFormatter.format(totals.totalSaved)}</span>
            </div>
          </div>

          <div className="space-y-3">
            {savingGoals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/40 bg-white/40 px-4 py-3 text-xs text-white/70">
                Chưa có mục tiêu tiết kiệm nào.
              </div>
            ) : (
              savingGoals.map((goal, index) => {
                const rawProgress =
                  Number(goal.target) > 0
                    ? (Number(goal.saved) / Number(goal.target)) * 100
                    : Number(goal.progress) || 0;
                const progress = Math.min(100, Math.max(0, rawProgress));
                const remaining = Math.max(0, Number(goal.target) - Number(goal.saved));
                return (
                  <div
                    key={goal.name}
                    className="rounded-2xl border border-white/35 bg-white/60 p-3 shadow-[0_12px_28px_-26px_rgba(0,0,0,0.35)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[11px] font-semibold text-white/80">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{goal.name}</p>
                          <p className="text-xs text-white/75">
                            {currencyFormatter.format(goal.saved)} / {currencyFormatter.format(goal.target)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-white/70">
                        {currencyFormatter.format(remaining)} còn lại
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${progress}%`,
                          background: `linear-gradient(90deg, ${goal.accent}, rgba(255,255,255,0.85))`,
                        }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-white/70">
                      <span>{Math.round(progress)}%</span>
                      <span>Đã đạt {currencyFormatter.format(goal.saved)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button
            type="button"
            className="w-full rounded-xl border border-white/30 bg-slate-900/80 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-24px_rgba(0,0,0,0.45)] transition-colors hover:bg-slate-900"
          >
            Thêm mục tiêu mới
          </button>
        </div>
      </div>
    </div>
  );
};
export default BudgetsGoals;
