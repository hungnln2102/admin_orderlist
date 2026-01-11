import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api";
import { SupplyOverviewData } from "../types";

type UseSupplyOverviewResult = {
  loading: boolean;
  data: SupplyOverviewData | null;
  error: string | null;
  selectedPaymentId: number | null;
  setSelectedPaymentId: React.Dispatch<React.SetStateAction<number | null>>;
  fetchDetail: () => Promise<void>;
};

export const useSupplyOverview = (
  isOpen: boolean,
  supplyId: number | null
): UseSupplyOverviewResult => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SupplyOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!supplyId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/supplies/${supplyId}/overview`);
      if (!res.ok) throw new Error("KhA'ng th ¯Ÿ t §œi thA'ng tin chi ti §¨t");
      const json = await res.json();

      const supply = json.supply || {};
      const stats = json.stats || {};
      const unpaid = Array.isArray(json.unpaidPayments)
        ? json.unpaidPayments
        : [];

      setData({ supply, stats, unpaidPayments: unpaid });
      if (unpaid.length > 0) setSelectedPaymentId(unpaid[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L ¯-i t §œi d ¯_ li ¯Øu");
    } finally {
      setLoading(false);
    }
  }, [supplyId]);

  useEffect(() => {
    if (isOpen && supplyId) {
      fetchDetail();
      return;
    }
    setData(null);
    setError(null);
    setSelectedPaymentId(null);
  }, [fetchDetail, isOpen, supplyId]);

  return {
    loading,
    data,
    error,
    selectedPaymentId,
    setSelectedPaymentId,
    fetchDetail,
  };
};
