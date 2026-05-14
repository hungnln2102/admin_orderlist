import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type SupplyOverview = {
  error?: string;
  supply?: {
    id?: number;
    sourceName?: string;
    bankName?: string;
    numberBank?: string;
    binBank?: string;
    nameBank?: string;
    isActive?: boolean;
    active_supply?: boolean;
  };
  stats?: {
    totalOrders?: number;
    paidOrders?: number;
    unpaidOrders?: number;
    canceledOrders?: number;
    totalPaidAmount?: number;
    monthlyOrders?: number;
  };
  unpaidPayments?: Array<{
    id: number;
    round?: string;
    status?: string;
    totalImport?: number;
    import_value?: number;
    paid?: number;
  }>;
  logOrdersByMonth?: Array<{
    month: number;
    orders: Array<{
      orderListId: number;
      idOrder: string;
      importCost: number;
      refundAmount: number;
      nccPaymentStatus: string;
      loggedAt: string;
    }>;
  }>;
};

export const useSupplyDetail = (supplyId: number | null, isOpen: boolean) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<SupplyOverview | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!supplyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/supplies/${supplyId}/overview`);
      const data = (await res.json()) as SupplyOverview;
      if (!res.ok) throw new Error(data?.error || "Không tải được chi tiết");
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, [supplyId]);

  useEffect(() => {
    if (isOpen && supplyId) {
      fetchOverview();
    } else if (!isOpen) {
      setOverview(null);
      setError(null);
    }
  }, [isOpen, supplyId, fetchOverview]);

  return { overview, loading, error, fetchOverview, setError };
};
