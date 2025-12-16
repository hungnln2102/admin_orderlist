import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../../../lib/api";

export const useSupplyDetail = (supplyId: number | null, isOpen: boolean) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);

  const fetchOverview = useCallback(async () => {
    if (!supplyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/supplies/${supplyId}/overview`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Không tải được chi tiết");
      setOverview(data);
    } catch (err: any) {
      setError(err?.message || "Đã có lỗi xảy ra");
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
