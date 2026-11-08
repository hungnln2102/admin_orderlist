import { useCallback, useEffect, useState } from "react";
import { TrafficApiResponse } from "../types";

export function useTrafficData(days: number) {
  const [data, setData] = useState<TrafficApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const refresh = useCallback(async (selectedDays = days) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/traffic/stats?days=${selectedDays}`);
      const json = await response.json();
      if (!json.success || !json.data) throw new Error(json.message || "Không thể tải dữ liệu traffic");
      setData(json.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi kết nối";
      console.error("Lỗi khi tải traffic stats:", error);
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void refresh(days);
  }, [days, refresh]);

  return { data, loading, errorMsg, refresh };
}
