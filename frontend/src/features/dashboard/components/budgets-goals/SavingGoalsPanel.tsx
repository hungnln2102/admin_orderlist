import React from "react";
import {
  ArrowTrendingDownIcon,
  ArrowUpIcon,
  PencilSquareIcon,
  RocketLaunchIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { Goal } from "./types";

export const SavingGoalsPanel: React.FC<{
  savingGoals: Goal[];
  totals: {
    totalSaved: number;
    totalTarget: number;
    totalRemaining: number;
    progress: number;
  };
  milestones: Array<{ index: number; position: number }>;
  currencyFormatter: Intl.NumberFormat;
  onAddGoal: () => void;
  onReorderGoal: (goalId: number, direction: "up" | "down") => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: number) => void;
}> = ({
  savingGoals,
  totals,
  milestones,
  currencyFormatter,
  onAddGoal,
  onReorderGoal,
  onEditGoal,
  onDeleteGoal,
}) => {
  return (
    <div className="min-w-0 space-y-4 lg:space-y-5">
      <div className="min-w-0 overflow-hidden rounded-[28px] border border-indigo-300/20 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_34%),linear-gradient(145deg,rgba(15,23,42,0.96),rgba(24,20,58,0.9))] p-4 shadow-[0_24px_60px_-26px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:p-5 lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-100/80">
              Savings
            </div>
            <p className="mt-3 text-lg font-bold leading-6 text-white">
              Mục tiêu tiết kiệm
            </p>
            <p className="mt-1 text-xs leading-5 text-white/60">
              Theo dõi tiến độ và sắp xếp ưu tiên từng hạng mục
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-indigo-100 shadow-inner shadow-white/5">
            <RocketLaunchIcon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_40px_-26px_rgba(0,0,0,0.9)]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                Đã tiết kiệm
              </p>
              <p className="mt-1 break-words text-2xl font-black tracking-tight text-white">
                {currencyFormatter.format(totals.totalSaved)}
              </p>
              <p className="mt-1 text-xs text-white/55">
                {savingGoals.length} hạng mục · {currencyFormatter.format(totals.totalTarget)} mục tiêu
              </p>
            </div>
            <div className="rounded-2xl border border-rose-200/10 bg-rose-500/[0.06] p-3 sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                Còn lại
              </p>
              <p className="mt-1 break-words text-xl font-bold tracking-tight text-rose-50">
                {currencyFormatter.format(totals.totalRemaining)}
              </p>
              <p className="mt-1 text-xs text-white/55">
                Hoàn thành {totals.progress.toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="relative h-3 overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-fuchsia-300 to-emerald-200 shadow-[0_0_18px_rgba(251,191,36,0.35)]"
                style={{ width: `${totals.progress}%` }}
              />
              {milestones.map((milestone) => (
                <span
                  key={`milestone-${milestone.index}`}
                  className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-white/70"
                  style={{ left: `${milestone.position}%` }}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium text-white/60">
              <span>{totals.progress.toFixed(2)}%</span>
              <span>Đã đạt {currencyFormatter.format(totals.totalSaved)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {savingGoals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-indigo-300/30 bg-white/[0.04] px-4 py-4 text-center text-xs text-white/60">
              Chưa có mục tiêu tiết kiệm nào.
            </div>
          ) : (
            savingGoals.map((goal, index) => {
              const target = Number(goal.target_amount) || 0;
              const saved = totals.totalSaved;
              const progress = target > 0 ? Math.min(100, (saved / target) * 100) : 0;

              const accentColors = [
                "#F8C573",
                "#9BE7C4",
                "#7CB3FF",
                "#F48FB1",
                "#C7D2FE",
                "#A5B4FC",
                "#F9A8D4",
              ];
              const accent = accentColors[index % accentColors.length];

              return (
                <div
                  key={goal.id}
                  className="group relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.055] p-3.5 shadow-[0_18px_42px_-30px_rgba(0,0,0,0.9)] transition-colors hover:border-white/20 hover:bg-white/[0.075]"
                >
                  <div
                    className="absolute inset-y-4 left-0 w-1 rounded-r-full"
                    style={{ backgroundColor: accent }}
                  />

                  <div className="flex items-start gap-3 pl-1">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-black text-slate-950 shadow-[0_10px_22px_-14px_rgba(255,255,255,0.7)]"
                      style={{ backgroundColor: accent }}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-bold leading-5 text-white">
                            {goal.goal_name}
                          </p>
                          <p className="mt-1 break-words text-xs leading-5 text-white/65">
                            {currencyFormatter.format(saved)} / {currencyFormatter.format(target)}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/35 px-2 py-1 text-[11px] font-bold text-white/80">
                          {progress.toFixed(2)}%
                        </span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/12">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${progress}%`,
                            background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,0.9))`,
                          }}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-[11px] font-medium text-white/55">
                          Đã đạt {currencyFormatter.format(saved)}
                        </p>
                        <div className="flex shrink-0 items-center rounded-full border border-white/10 bg-slate-950/35 p-1">
                          <button
                            type="button"
                            onClick={() => onReorderGoal(goal.id, "up")}
                            className="rounded-full p-1.5 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                            title="Tăng ưu tiên"
                          >
                            <ArrowUpIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onReorderGoal(goal.id, "down")}
                            className="rounded-full p-1.5 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                            title="Giảm ưu tiên"
                          >
                            <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditGoal(goal)}
                            className="rounded-full p-1.5 text-white/55 transition-colors hover:bg-amber-300/15 hover:text-amber-100"
                            title="Sửa giá mục tiêu"
                          >
                            <PencilSquareIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteGoal(goal.id)}
                            className="rounded-full p-1.5 text-white/55 transition-colors hover:bg-red-400/20 hover:text-red-100"
                            title="Xóa mục tiêu"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={onAddGoal}
          className="mt-4 w-full rounded-2xl border border-indigo-300/30 bg-indigo-400/10 px-4 py-3 text-sm font-bold text-white shadow-[0_16px_32px_-24px_rgba(99,102,241,0.65)] transition-all hover:border-indigo-200/50 hover:bg-indigo-400/20"
        >
          + Thêm mục tiêu mới
        </button>
      </div>
    </div>
  );
};