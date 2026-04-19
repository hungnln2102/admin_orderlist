import React from "react";
import FinanceSummaryCard from "./FinanceSummaryCard";
import BudgetsGoals from "./BudgetsGoals";
import WalletBalancesCard from "./WalletBalancesCard/WalletBalancesCard";
import { type WalletColumn, type WalletRow } from "../hooks/useWalletBalances";

type FinanceSummaryItem = {
  title: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  accent: "amber" | "emerald";
  icon: React.ElementType;
};

type Budget = { name: string; used: number; total: number };
type SavingGoal = { id: number; goal_name: string; target_amount: number; priority: number; created_at: string };

type FinanceSectionProps = {
  financeSummary: FinanceSummaryItem[];
  budgets: Budget[];
  savingGoals: SavingGoal[];
  currencyFormatter: Intl.NumberFormat;
  walletColumns: WalletColumn[];
  walletRows: WalletRow[];
  walletLoading: boolean;
  walletError: string | null;
  onRefreshWallets: () => void;
  onRefreshStats?: () => void;
  onRefetchGoals?: () => void;
  availableProfit?: { current: number; previous: number };
};

export const FinanceSection: React.FC<FinanceSectionProps> = ({
  financeSummary,
  budgets,
  savingGoals,
  currencyFormatter,
  walletColumns,
  walletRows,
  walletLoading,
  walletError,
  onRefreshWallets,
  onRefreshStats,
  onRefetchGoals,
  availableProfit,
}) => {
  return (
    <div className="space-y-5 sm:space-y-6 rounded-3xl bg-gradient-to-br from-indigo-950/20 via-slate-900/30 to-slate-950/20 border border-indigo-400/10 p-4 sm:p-5 lg:p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {financeSummary.map((item) => (
          <FinanceSummaryCard key={item.title} {...item} />
        ))}
      </div>

      <BudgetsGoals
        budgets={budgets}
        savingGoals={savingGoals}
        currencyFormatter={currencyFormatter}
        walletColumns={walletColumns}
        walletRows={walletRows}
        onRefetchGoals={onRefetchGoals}
        availableProfit={availableProfit}
      />

      <WalletBalancesCard
        columns={walletColumns}
        rows={walletRows}
        loading={walletLoading}
        error={walletError}
        onRefresh={onRefreshWallets}
        onRefreshStats={onRefreshStats}
        currencyFormatter={currencyFormatter}
      />
    </div>
  );
};
