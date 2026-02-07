import { useCallback, useEffect, useState } from "react";
import { ORDER_DATASET_CONFIG, Order, OrderDatasetKey } from "../../../../constants";
import { API_BASE_URL } from "../../../../lib/api";

const API_BASE = API_BASE_URL;

export function useOrdersFetch(dataset: OrderDatasetKey) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setFetchError(null);
      const endpoint = ORDER_DATASET_CONFIG[dataset].endpoint;
      const response = await fetch(`${API_BASE}${endpoint}`, {
        credentials: "include",
      });
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok) {
        throw new Error(`Lỗi máy chủ: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setOrders(data as Order[]);
      } else {
        console.error("Dữ liệu nhận được không phải là mảng:", data);
      }
    } catch (error) {
      console.error("Lỗi khi tải đơn hàng:", error);
      const { handleNetworkError } = await import("@/lib/errorHandler");
      const friendlyMessage = handleNetworkError(error);
      setFetchError(friendlyMessage);
    }
  }, [dataset]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, setOrders, fetchError, fetchOrders };
}
