import { useMemo } from "react";
import type { WalletColumn, WalletRow } from "../../hooks/useWalletBalances";

export const useAssetStats = ({
  walletRows,
  walletColumns,
  goldValue,
  goldCost,
}: {
  walletRows: WalletRow[];
  walletColumns: WalletColumn[];
  goldValue?: number | null;
  goldCost?: number | null;
}) => {
  return useMemo(() => {
    const latestRow = walletRows?.[0];
    const prevRow = walletRows?.[1];

    const getStatsFromRow = (row: WalletRow | undefined) => {
      if (!row) return { cash: 0, gold: 0, investment: 0, total: 0 };

      const fundCol = walletColumns.find((col) => {
        const name = String(col.name || "").toLowerCase();
        return name.includes("quỹ") || name.includes("quy");
      });

      const goldCol = walletColumns.find((col) => {
        const name = String(col.name || "").toLowerCase();
        return (
          name.includes("vàng") || name.includes("gold") || name.includes("vang")
        );
      });

      const vndCols = walletColumns.filter((col) => {
        const assetCode = String(col.assetCode || "").trim().toUpperCase();
        const name = String(col.name || "").toLowerCase();
        if (
          name.includes("hana") ||
          name.includes("gold") ||
          name.includes("vàng") ||
          name.includes("vang")
        )
          return false;
        if (fundCol && col.field === fundCol.field) return false;
        return !assetCode || assetCode === "VND";
      });

      const cash = vndCols.reduce(
        (sum, col) => sum + (Number(row.values[col.field] || 0) || 0),
        0
      );
      const investment = fundCol
        ? Number(row.values[fundCol.field] || 0) || 0
        : 0;
      const gold = goldCol ? Number(row.values[goldCol.field] || 0) || 0 : 0;

      return { cash, gold, investment, total: cash + gold + investment };
    };

    const current = getStatsFromRow(latestRow);
    const previous = getStatsFromRow(prevRow);

    if (goldValue !== undefined && goldValue !== null) {
      current.gold = goldValue;
      current.total = current.cash + current.gold + current.investment;
    }

    const calcChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Number((((curr - prev) / prev) * 100).toFixed(1));
    };

    if (goldCost && current.gold > 0) {
      current.total = current.cash + current.gold + current.investment;
      const goldTrend = Number(
        (((current.gold - goldCost) / goldCost) * 100).toFixed(1)
      );

      return {
        current,
        changes: {
          cash: calcChange(current.cash, previous.cash),
          gold: goldTrend,
          investment: calcChange(current.investment, previous.investment),
          total: calcChange(current.total, previous.total),
        },
      };
    }

    return {
      current,
      changes: {
        cash: calcChange(current.cash, previous.cash),
        gold: calcChange(current.gold, previous.gold),
        investment: calcChange(current.investment, previous.investment),
        total: calcChange(current.total, previous.total),
      },
    };
  }, [walletRows, walletColumns, goldValue, goldCost]);
};
