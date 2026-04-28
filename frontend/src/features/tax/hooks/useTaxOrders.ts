import { useCallback, useEffect, useState } from "react";
import {
  fetchTaxOrdersWithFallback,
  TAX_ORDER_START_DATE,
  type TaxOrder,
} from "../api/taxApi";

export const useTaxOrders = () => {
  const [orders, setOrders] = useState<TaxOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTaxOrdersWithFallback(TAX_ORDER_START_DATE);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải đơn tính thuế.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { orders, loading, error, refetch };
};
