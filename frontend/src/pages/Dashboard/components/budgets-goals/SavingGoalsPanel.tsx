import React from "react";
import {
  ArrowTrendingDownIcon,
  ArrowUpIcon,
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
  onDeleteGoal: (goalId: number) => void;
}> = ({
  savingGoals,
  totals,
  milestones,
  currencyFormatter,
  onAddGoal,
  onReorderGoal,
  onDeleteGoal,
}) => {
  return (
    <div className="space-y-4 lg:space-y-5">
      <div className="space-y-4 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900/50 to-slate-950/40 border border-indigo-400/20 backdrop-blur-xl p-4 sm:p-5 lg:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-white">Mục tiêu tiết kiệm</p>
            <p className="text-xs text-white/70">
              Theo dõi tiến độ theo từng hàng mục
            </p>
          </div>
          <RocketLaunchIcon className="h-5 w-5 text-white/70" />
        </div>

        <div className="rounded-2xl border border-indigo-400/30 bg-indigo-950/20 p-4 shadow-[0_12px_24px_-12px_rgba(0,0,0,0.3)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/80">
                Tổng quan
              </p>
              <p className="text-2xl font-semibold text-white">
                {currencyFormatter.format(totals.totalSaved)}
              </p>
              <p className="text-xs text-white/70">
                {currencyFormatter.format(totals.totalTarget)} mục tiêu :{" "}
                {savingGoals.length} hạng mục
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/60">Còn lại</p>
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
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-indigo-400/60 bg-indigo-950/80 text-[11px] font-semibold text-indigo-200 shadow-[0_8px_16px_-12px_rgba(79,70,229,0.4)]">
                  {milestone.index}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-white/70">
            <span>{totals.progress.toFixed(2)}%</span>
            <span>Đã đạt {currencyFormatter.format(totals.totalSaved)}</span>
          </div>
        </div>

        <div className="space-y-3">
          {savingGoals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-indigo-400/40 bg-indigo-950/20 px-4 py-3 text-xs text-white/70">
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
                  className="rounded-2xl border border-indigo-400/30 bg-indigo-950/20 p-3 shadow-[0_12px_24px_-12px_rgba(0,0,0,0.3)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[11px] font-semibold text-white/80">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">
                          {goal.goal_name}
                        </p>
                        <p className="text-xs text-white/75">
                          {currencyFormatter.format(saved)} /{" "}
                          {currencyFormatter.format(target)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onReorderGoal(goal.id, "up")}
                        className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                        title="Tăng ưu tiên"
                      >
                        <ArrowUpIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onReorderGoal(goal.id, "down")}
                        className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                        title="Giảm ưu tiên"
                      >
                        <ArrowTrendingDownIcon className="h-4 w-4" />
                      </button>
                      <div className="h-4 w-px bg-white/20 mx-0.5" />
                      <button
                        onClick={() => onDeleteGoal(goal.id)}
                        className="rounded-lg p-1.5 text-white/60 hover:bg-red-400/80 hover:text-white transition-colors"
                        title="Xóa mục tiêu"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,0.85))`,
                      }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-white/70">
                    <span>{progress.toFixed(2)}%</span>
                    <span>Đã đạt {currencyFormatter.format(saved)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={onAddGoal}
          className="w-full rounded-xl border border-indigo-400/40 bg-indigo-950/50 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_-12px_rgba(79,70,229,0.3)] transition-colors hover:bg-indigo-950/70 hover:border-indigo-400/60"
        >
          Thêm mục tiêu mới
        </button>
      </div>
    </div>
  );
};
