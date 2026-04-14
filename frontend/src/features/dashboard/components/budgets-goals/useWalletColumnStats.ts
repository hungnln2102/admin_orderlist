import { useMemo } from "react";
import type { WalletColumn, WalletRow } from "../../hooks/useWalletBalances";

export type WalletColumnStat = {
  field: string;
  name: string;
  assetCode?: string;
  current: number;
  previous: number;
  changePct: number;
};

const calcChange = (curr: number, prev: number) => {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Number((((curr - prev) / prev) * 100).toFixed(1));
};

export const useWalletColumnStats = (
  walletRows: WalletRow[],
  walletColumns: WalletColumn[]
): WalletColumnStat[] => {
  return useMemo(() => {
    const latest = walletRows?.[0];
    const prev = walletRows?.[1];
    if (!walletColumns.length) return [];

    return walletColumns.map((col) => {
      const current = latest
        ? Number(latest.values[col.field] || 0) || 0
        : 0;
      const previous = prev ? Number(prev.values[col.field] || 0) || 0 : 0;
      return {
        field: col.field,
        name: col.name || col.field,
        assetCode: col.assetCode,
        current,
        previous,
        changePct: calcChange(current, previous),
      };
    });
  }, [walletRows, walletColumns]);
};
