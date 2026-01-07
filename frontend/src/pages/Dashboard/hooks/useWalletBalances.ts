import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";

export type WalletColumn = {
  id: number;
  name: string;
  field: string;
  note?: string;
  linkedWalletId?: number | null;
  assetCode?: string;
};

export type WalletRow = { recordDate: string; values: Record<string, number> };

type ApiResponse = {
  wallets?: WalletColumn[];
  rows?: WalletRow[];
};

export const useWalletBalances = () => {
  const [walletColumns, setWalletColumns] = useState<WalletColumn[]>([]);
  const [walletRows, setWalletRows] = useState<WalletRow[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const fetchWalletBalances = useCallback(async () => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      const res = await apiFetch("/api/wallets/daily-balances");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiResponse = await res.json();
      setWalletColumns(Array.isArray(json?.wallets) ? json.wallets : []);
      setWalletRows(Array.isArray(json?.rows) ? json.rows : []);
    } catch (err) {
      console.error("Failed to fetch wallet balances:", err);
      setWalletError("Không thể tải dữ liệu dòng tiền từ cơ sở dữ liệu.");
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWalletBalances();
  }, [fetchWalletBalances]);

  const sortedColumns = useMemo(
    () => [...walletColumns].sort((a, b) => a.id - b.id),
    [walletColumns]
  );

  return {
    walletColumns: sortedColumns,
    walletRows,
    walletLoading,
    walletError,
    fetchWalletBalances,
  };
};
