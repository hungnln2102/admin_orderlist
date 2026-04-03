import { useCallback, useEffect, useState } from "react";
import {
  fetchMonthlySummary,
  type MonthlySummaryData,
} from "@/features/dashboard/api/dashboardApi";
import { normalizeErrorMessage } from "@/lib/textUtils";

export const useMonthlySummary = () => {
  const [data, setData] = useState<MonthlySummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMonthlySummary();
      setData(result);
    } catch (err) {
      console.error("Error loading monthly summary data:", err);
      setError(
        err instanceof Error
          ? normalizeErrorMessage(err.message, {
              fallback: "Không thể tải dữ liệu tóm tắt hàng tháng.",
            })
          : "Không thể tải dữ liệu tóm tắt hàng tháng."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};
