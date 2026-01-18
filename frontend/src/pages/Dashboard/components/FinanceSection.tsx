import React, { useMemo } from "react";
import FinanceSummaryCard from "./FinanceSummaryCard";
import GoldPriceTable from "./GoldPriceTable";
import BudgetsGoals from "./BudgetsGoals";
import WalletBalancesCard from "./WalletBalancesCard/WalletBalancesCard";
import { type GoldPriceRow } from "../hooks/useGoldPrices";
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
type SavingGoal = { id: number; goal_name: string; target_amount: number; created_at: string };

type FinanceSectionProps = {
  financeSummary: FinanceSummaryItem[];
  budgets: Budget[];
  savingGoals: SavingGoal[];
  currencyFormatter: Intl.NumberFormat;
  goldRows: GoldPriceRow[];
  goldLoading: boolean;
  goldError: string | null;
  onRefreshGold: () => void;
  latestGoldBid: number | null;
  walletColumns: WalletColumn[];
  walletRows: WalletRow[];
  walletLoading: boolean;
  walletError: string | null;
  onRefreshWallets: () => void;
  onRefetchGoals?: () => void;
};

export const FinanceSection: React.FC<FinanceSectionProps> = ({
  financeSummary,
  budgets,
  savingGoals,
  currencyFormatter,
  goldRows,
  goldLoading,
  goldError,
  onRefreshGold,
  latestGoldBid,
  walletColumns,
  walletRows,
  walletLoading,
  walletError,
  onRefreshWallets,
  onRefetchGoals,
}) => {
  const goldField =
    walletColumns.find((c) => c.id === 7)?.field ||
    walletColumns.find((c) => (c.assetCode || "").toUpperCase() !== "VND")?.field ||
    null;

  const goldCostField = useMemo(() => {
    const byId = walletColumns.find((c) => c.id === 5);
    if (byId) return byId.field;
    const byName = walletColumns.find((c) => (c.name || "").toLowerCase().includes("hana"));
    return byName ? byName.field : null;
  }, [walletColumns]);

  const totalGoldAmount = goldField
    ? walletRows.reduce((sum, row) => sum + (Number(row.values[goldField] || 0) || 0), 0)
    : 0;

  const totalGoldCostFromWallet =
    goldCostField && walletRows.length
      ? walletRows.reduce((sum, row) => sum + (Number(row.values[goldCostField] || 0) || 0), 0)
      : null;

  const goldPricePerChiBuy = latestGoldBid ? latestGoldBid / 10 : null;
  const latestAsk = goldRows.length ? Number(goldRows[0]?.ask || 0) || null : null;
  const goldPricePerChiSell = latestAsk ? latestAsk / 10 : null;

  const goldValue = goldPricePerChiSell ? totalGoldAmount * goldPricePerChiSell : null;
  const goldCost =
    totalGoldCostFromWallet !== null
      ? totalGoldCostFromWallet
      : goldPricePerChiBuy
      ? totalGoldAmount * goldPricePerChiBuy
      : null;

  const goldProfit =
    goldValue !== null && goldCost !== null ? goldValue - goldCost : goldValue ?? null;

  const goldTableRows = goldRows.map((row, idx) =>
    idx === 0
      ? {
          ...row,
          totalGoldAmount,
          totalGoldValue: goldCost ?? undefined,
          profit: goldProfit ?? undefined,
        }
      : row
  );

  return (
    <div className="space-y-6 rounded-[32px] bg-white/5 border border-white/10 p-6 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.7)] backdrop-blur">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {financeSummary.map((item) => (
          <FinanceSummaryCard key={item.title} {...item} />
        ))}
      </div>

      <GoldPriceTable loading={goldLoading} error={goldError} rows={goldTableRows} onRefresh={onRefreshGold} />

      <BudgetsGoals
        budgets={budgets}
        savingGoals={savingGoals}
        currencyFormatter={currencyFormatter}
        walletColumns={walletColumns}
        walletRows={walletRows}
        goldValue={goldValue}
        onRefetchGoals={onRefetchGoals}
      />

      <WalletBalancesCard
        columns={walletColumns}
        rows={walletRows}
        loading={walletLoading}
        error={walletError}
        onRefresh={onRefreshWallets}
        currencyFormatter={currencyFormatter}
        goldPrice={latestGoldBid}
      />
    </div>
  );
};
