import { useCallback } from "react";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import {
  fetchTaxOrdersWithFallback,
  TAX_ORDER_START_DATE,
  type TaxOrder,
} from "../api/taxApi";

export const useTaxOrders = () => {
  const fetcher = useCallback(() => fetchTaxOrdersWithFallback(TAX_ORDER_START_DATE), []);
  const { data, loading, error, refetch } = useApiQuery<TaxOrder[]>(fetcher, { initialData: [] });

  return { 
    orders: data || [], 
    loading, 
    error: error ? error.message : null, 
    refetch 
  };
};
