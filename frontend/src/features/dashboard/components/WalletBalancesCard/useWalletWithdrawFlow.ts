import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/shared/api/client";

type WalletCardTab = "daily_flow" | "withdraw";

export type WithdrawItem = {
  id: number;
  amount: number;
  reason: string;
  expenseDate: string | null;
};

export const useWalletWithdrawFlow = ({
  activeTab,
  onRefreshStats,
}: {
  activeTab: WalletCardTab;
  onRefreshStats?: () => void;
}) => {
  const [withdrawRows, setWithdrawRows] = useState<WithdrawItem[]>([]);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  const loadWithdrawRows = useCallback(async () => {
    setWithdrawLoading(true);
    setWithdrawError(null);
    try {
      const response = await apiFetch(
        "/api/store-profit-expenses?expense_type=withdraw_profit"
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const items = Array.isArray(payload?.items) ? payload.items : [];
      setWithdrawRows(
        items.map((item) => ({
          id: Number(item.id || 0),
          amount: Number(item.amount || 0),
          reason: String(item.reason || ""),
          expenseDate: item.expenseDate || null,
        }))
      );
    } catch (errorFetch) {
      console.error("Failed to fetch withdraw rows:", errorFetch);
      setWithdrawError("Kh??ng th??? t???i d??? li???u r??t ti???n.");
    } finally {
      setWithdrawLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "withdraw") return;
    void loadWithdrawRows();
  }, [activeTab, loadWithdrawRows]);

  const handleWithdrawSuccess = useCallback(() => {
    void loadWithdrawRows();
    onRefreshStats?.();
    setWithdrawModalOpen(false);
  }, [loadWithdrawRows, onRefreshStats]);

  return {
    withdrawRows,
    withdrawLoading,
    withdrawError,
    withdrawModalOpen,
    setWithdrawModalOpen,
    handleWithdrawSuccess,
  };
};
