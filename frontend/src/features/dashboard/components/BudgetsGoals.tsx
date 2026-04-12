import React, { useMemo, useState } from "react";
import {
  ArrowUpIcon,
  BanknotesIcon,
  ChartBarSquareIcon,
  CubeIcon,
  RocketLaunchIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";
import ConfirmModal from "@/components/modals/ConfirmModal/ConfirmModal";
import { AddGoalModal } from "./AddGoalModal";
import { ExpenseBreakdownChart } from "./budgets-goals/ExpenseBreakdownChart";
import { SavingGoalsPanel } from "./budgets-goals/SavingGoalsPanel";
import { WeeklyStatCard } from "./budgets-goals/WeeklyStatCard";
import type { BudgetsGoalsProps } from "./budgets-goals/types";
import { useSavingGoalsActions } from "./budgets-goals/useSavingGoalsActions";
import { useWalletColumnStats } from "./budgets-goals/useWalletColumnStats";
import { formatValue } from "./WalletBalancesCard/utils";

const COLUMN_STAT_ICONS = [
  BanknotesIcon,
  ArrowUpIcon,
  ScaleIcon,
  ChartBarSquareIcon,
  CubeIcon,
] as const;

const BudgetsGoals: React.FC<BudgetsGoalsProps> = ({
  budgets,
  savingGoals,
  currencyFormatter,
  walletColumns,
  walletRows,
  onRefetchGoals,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [goalIdPendingDelete, setGoalIdPendingDelete] = useState<number | null>(null);
  const [goalDeleteSubmitting, setGoalDeleteSubmitting] = useState(false);

  const { handleReorder, handleDelete } = useSavingGoalsActions({
    savingGoals,
    onRefetchGoals,
  });

  const totals = useMemo(() => {
    const latestWalletRow = walletRows?.[0];
    let fundValue = 0;

    if (latestWalletRow) {
      const fundColumn = walletColumns.find((col) => {
        const name = String(col.name || "").toLowerCase();
        return name.includes("quỹ") || name.includes("quy");
      });

      if (fundColumn) {
        fundValue = Number(latestWalletRow.values[fundColumn.field] || 0) || 0;
      }
    }

    const totalTarget = savingGoals.reduce(
      (sum, goal) => sum + (Number(goal.target_amount) || 0),
      0
    );
    const totalSaved = fundValue;
    const totalRemaining = Math.max(0, totalTarget - totalSaved);
    const progress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
    return {
      totalSaved,
      totalTarget,
      totalRemaining,
      progress: Math.min(100, Math.max(0, progress)),
    };
  }, [savingGoals, walletRows, walletColumns]);

  const milestones = useMemo(() => {
    if (totals.totalTarget <= 0) return [];
    let accumulated = 0;
    return savingGoals.map((goal, index) => {
      accumulated += Number(goal.target_amount) || 0;
      const pos = (accumulated / totals.totalTarget) * 100;
      const clamped = Math.min(100, Math.max(0, pos));
      return { index: index + 1, position: clamped };
    });
  }, [savingGoals, totals.totalTarget]);

  const columnStats = useWalletColumnStats(walletRows, walletColumns);

  return (
    <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-[1.7fr_1fr]">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900/50 to-slate-950/40 border border-indigo-400/20 backdrop-blur-xl p-4 sm:p-5 lg:p-6 space-y-5 sm:space-y-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
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
        />

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(10.5rem,1fr))]">
          {columnStats.map((stat, index) => {
            const Icon = COLUMN_STAT_ICONS[index % COLUMN_STAT_ICONS.length];
            return (
              <WeeklyStatCard
                key={stat.field}
                title={stat.name}
                value={formatValue(
                  stat.current,
                  stat.assetCode,
                  currencyFormatter
                )}
                change={stat.changePct}
                icon={Icon}
              />
            );
          })}
        </div>
      </div>

      <SavingGoalsPanel
        savingGoals={savingGoals}
        totals={totals}
        milestones={milestones}
        currencyFormatter={currencyFormatter}
        onAddGoal={() => setIsAddModalOpen(true)}
        onReorderGoal={handleReorder}
        onDeleteGoal={(id) => setGoalIdPendingDelete(id)}
      />

      <AddGoalModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          onRefetchGoals?.();
        }}
      />

      <ConfirmModal
        isOpen={goalIdPendingDelete !== null}
        onClose={() => {
          if (!goalDeleteSubmitting) setGoalIdPendingDelete(null);
        }}
        onConfirm={() => {
          if (goalIdPendingDelete == null) return;
          const id = goalIdPendingDelete;
          setGoalDeleteSubmitting(true);
          void handleDelete(id)
            .then(() => setGoalIdPendingDelete(null))
            .finally(() => setGoalDeleteSubmitting(false));
        }}
        title="Xóa mục tiêu?"
        message="Bạn có chắc muốn xóa mục tiêu tiết kiệm này?"
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        isSubmitting={goalDeleteSubmitting}
      />
    </div>
  );
};

export default BudgetsGoals;
