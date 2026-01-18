import React, { useMemo, useState } from "react";
import {
  RocketLaunchIcon,
  BanknotesIcon,
  WalletIcon,
  ArrowUpIcon,
  ScaleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import type { WalletColumn, WalletRow } from "../hooks/useWalletBalances";
import { AddGoalModal } from "./AddGoalModal";

interface Budget {
  name: string;
  used: number;
  total: number;
}

interface Goal {
  id: number;
  goal_name: string;
  target_amount: number;
  priority: number;
  created_at: string;
}

interface Props {
  budgets: Budget[];
  savingGoals: Goal[];
  currencyFormatter: Intl.NumberFormat;
  walletColumns: WalletColumn[];
  walletRows: WalletRow[];
  goldValue?: number | null;
  onRefetchGoals?: () => void;
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
                  <div className="text-xs uppercase tracking-wide text-white/60">Tài sản</div>
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

const WeeklyStatCard: React.FC<{
  title: string;
  value: string | number;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
}> = ({ title, value, change, icon: Icon }) => {
  const isPositive = change >= 0;
  const TrendIcon = isPositive ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;

  return (
    <div className="bg-gradient-to-br from-indigo-950/80 to-purple-950/60 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all duration-300">
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
          <Icon className="h-5 w-5 text-indigo-400" />
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            isPositive
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/20 text-rose-400'
          }`}
        >
          <TrendIcon className="h-3 w-3" />
          {Math.abs(change)}%
        </div>
      </div>
      <div className="space-y-0.5">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-white/60">{title}</p>
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
  onRefetchGoals,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleReorder = async (goalId: number, direction: 'up' | 'down') => {
    const currentGoal = savingGoals.find(g => g.id === goalId);
    if (!currentGoal) return;

    // Calculate new priority for current goal
    const newPriority = direction === 'down' 
      ? (currentGoal.priority || 0) + 1 
      : (currentGoal.priority || 0) - 1;

    // Find goal with conflicting priority
    const conflictingGoal = savingGoals.find(g => 
      g.id !== goalId && g.priority === newPriority
    );

    try {
      const updates = [];

      // Update current goal's priority
      updates.push(
        fetch(`/api/saving-goals/${currentGoal.id}/priority`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: newPriority }),
        })
      );

      // If there's a conflicting goal, adjust its priority
      if (conflictingGoal) {
        const conflictingNewPriority = direction === 'down'
          ? conflictingGoal.priority - 1  // Move conflicting goal up
          : conflictingGoal.priority + 1; // Move conflicting goal down

        updates.push(
          fetch(`/api/saving-goals/${conflictingGoal.id}/priority`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority: conflictingNewPriority }),
          })
        );
      }

      await Promise.all(updates);

      // Refetch goals to get updated order
      if (onRefetchGoals) {
        onRefetchGoals();
      }
    } catch (error) {
      console.error('Error reordering goal:', error);
    }
  };

  const handleDelete = async (goalId: number) => {
    if (!confirm('Bạn có chắc muốn xóa mục tiêu này?')) return;

    try {
      const response = await fetch(`/api/saving-goals/${goalId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete goal');
      }

      // Refetch goals to get updated list
      if (onRefetchGoals) {
        onRefetchGoals();
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Không thể xóa mục tiêu. Vui lòng thử lại.');
    }
  };

  const totals = useMemo(() => {
    // Get fund value from wallet data
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
    
    // totalTarget comes from API (sum of target_amount)
    const totalTarget = savingGoals.reduce((sum, goal) => sum + (Number(goal.target_amount) || 0), 0);
    // totalSaved is the current fund value
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
    let acc = 0;
    return savingGoals.map((goal, index) => {
      acc += Number(goal.target_amount) || 0;
      const pos = (acc / totals.totalTarget) * 100;
      const clamped = Math.min(100, Math.max(0, pos));
      return { index: index + 1, position: clamped };
    });
  }, [savingGoals, totals.totalTarget]);

  // Calculate asset values from wallet data
  const assetStats = useMemo(() => {
    const latestWalletRow = walletRows?.[0];
    if (!latestWalletRow) {
      return {
        cash: 0,
        gold: goldValue || 0,
        investment: 0,
        total: goldValue || 0,
      };
    }

    // Get "Quỹ" column first
    const fundColumn = walletColumns.find((col) => {
      const name = String(col.name || "").toLowerCase();
      return name.includes("quỹ") || name.includes("quy");
    });

    // Get VND columns (cash) - exclude fund to avoid double counting
    const vndColumns = walletColumns.filter((col) => {
      const assetCode = String(col.assetCode || "").trim().toUpperCase();
      const name = String(col.name || "").toLowerCase();
      // Exclude gold/hana columns
      if (name.includes("hana")) return false;
      // Exclude fund column (will be counted separately as investment)
      if (fundColumn && col.field === fundColumn.field) return false;
      // Only VND or empty asset code
      return !assetCode || assetCode === "VND";
    });

    const cashValue = vndColumns.reduce((sum, col) => {
      return sum + (Number(latestWalletRow.values[col.field] || 0) || 0);
    }, 0);

    const investmentValue = fundColumn 
      ? (Number(latestWalletRow.values[fundColumn.field] || 0) || 0)
      : 0;

    const goldVal = goldValue || 0;
    const totalAssets = cashValue + goldVal + investmentValue;

    return {
      cash: cashValue,
      gold: goldVal,
      investment: investmentValue,
      total: totalAssets,
    };
  }, [walletRows, walletColumns, goldValue]);

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

        {/* Asset Statistics - Real Data */}
        <div className="grid grid-cols-2 gap-3">
          <WeeklyStatCard 
            title="Tiền Mặt" 
            value={currencyFormatter.format(assetStats.cash)} 
            change={8.5} 
            icon={BanknotesIcon} 
          />
          <WeeklyStatCard 
            title="Vàng" 
            value={currencyFormatter.format(assetStats.gold)} 
            change={-2.3} 
            icon={WalletIcon} 
          />
          <WeeklyStatCard 
            title="Đầu Tư" 
            value={currencyFormatter.format(assetStats.investment)} 
            change={15.7} 
            icon={ArrowUpIcon} 
          />
          <WeeklyStatCard 
            title="Tổng Tài Sản" 
            value={currencyFormatter.format(assetStats.total)} 
            change={5.2} 
            icon={ScaleIcon} 
          />
        </div>
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
                  {currencyFormatter.format(totals.totalTarget)} mục tiêu : {savingGoals.length} hạng mục
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
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/50 bg-slate-900/80 text-[10px] font-semibold text-white shadow-[0_8px_16px_-12px_rgba(0,0,0,0.55)]">
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
              <div className="rounded-2xl border border-dashed border-white/40 bg-white/40 px-4 py-3 text-xs text-white/70">
                Chưa có mục tiêu tiết kiệm nào.
              </div>
            ) : (
              savingGoals.map((goal, index) => {
                const target = Number(goal.target_amount) || 0;
                
                // Each goal shows progress based on total fund
                // Not proportional allocation - all goals use the same fund value
                const saved = totals.totalSaved;
                
                const progress = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
                const remaining = Math.max(0, target - saved);
                
                // Generate accent color based on index
                const accentColors = [
                  "#F8C573", "#9BE7C4", "#7CB3FF", "#F48FB1", 
                  "#C7D2FE", "#A5B4FC", "#F9A8D4"
                ];
                const accent = accentColors[index % accentColors.length];
                
                return (
                  <div
                    key={goal.id}
                    className="rounded-2xl border border-white/35 bg-white/60 p-3 shadow-[0_12px_28px_-26px_rgba(0,0,0,0.35)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[11px] font-semibold text-white/80">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">{goal.goal_name}</p>
                          <p className="text-xs text-white/75">
                            {currencyFormatter.format(saved)} / {currencyFormatter.format(target)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleReorder(goal.id, 'up')}
                          className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                          title="Tăng ưu tiên"
                        >
                          <ArrowUpIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReorder(goal.id, 'down')}
                          className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                          title="Giảm ưu tiên"
                        >
                          <ArrowTrendingDownIcon className="h-4 w-4" />
                        </button>
                        <div className="h-4 w-px bg-white/20 mx-0.5" />
                        <button
                          onClick={() => handleDelete(goal.id)}
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
            onClick={() => setIsAddModalOpen(true)}
            className="w-full rounded-xl border border-white/30 bg-slate-900/80 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-24px_rgba(0,0,0,0.45)] transition-colors hover:bg-slate-900"
          >
            Thêm mục tiêu mới
          </button>
        </div>
      </div>
      
      {/* Add Goal Modal */}
      <AddGoalModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          if (onRefetchGoals) {
            onRefetchGoals();
          }
        }}
        currencyFormatter={currencyFormatter}
      />
    </div>
  );
};
export default BudgetsGoals;
