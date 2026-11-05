import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { invalidateApiCache } from "@/shared/api/apiCache";

export interface RealtimeEventData {
  type: string;
  payload: any;
  timestamp: number;
}

interface RealtimeContextValue {
  isConnected: boolean;
  lastEvent: RealtimeEventData | null;
  subscribe: (eventTypes: string | string[], callback: (event: RealtimeEventData) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEventData | null>(null);
  const listenersRef = useRef<Map<string, Set<(event: RealtimeEventData) => void>>>(new Map());
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;

    const connect = () => {
      if (isDisposed) return;
      try {
        es = new EventSource("/api/realtime/stream", { withCredentials: true });
        eventSourceRef.current = es;

        es.onopen = () => {
          if (isDisposed) return;
          setIsConnected(true);
          console.log("⚡ [RealtimeSSE] Kết nối Live Stream thành công!");
        };

        es.onmessage = (messageEvent) => {
          if (isDisposed) return;
          try {
            const data: RealtimeEventData = JSON.parse(messageEvent.data);
            if (!data?.type) return;

            setLastEvent(data);

            // Invalidate cache tương ứng theo domain event
            if (data.type.startsWith("ORDER_")) {
              invalidateApiCache(["/api/orders"]);
            } else if (data.type.startsWith("SUPPLIER_")) {
              invalidateApiCache(["/api/suppliers"]);
            } else if (data.type.startsWith("PRODUCT_")) {
              invalidateApiCache(["/api/products"]);
            } else if (data.type.startsWith("WEBHOOK_")) {
              invalidateApiCache(["/api/orders", "/api/invoices", "/api/suppliers", "/api/dashboard"]);
            } else if (data.type.startsWith("WAREHOUSE_") || data.type.startsWith("PACKAGE_")) {
              invalidateApiCache(["/api/warehouse", "/api/products"]);
            } else if (data.type.startsWith("FINANCE_") || data.type.startsWith("FINANCIAL_")) {
              invalidateApiCache(["/api/finance", "/api/wallets", "/api/dashboard"]);
            } else if (data.type.startsWith("PAYMENT_RECEIPT_") || data.type.startsWith("BATCH_PAYMENT_")) {
              invalidateApiCache(["/api/invoices", "/api/orders"]);
            } else if (data.type.startsWith("STORE_PROFIT_EXPENSE_")) {
              invalidateApiCache(["/api/store-profit-expenses", "/api/dashboard"]);
            } else if (data.type.startsWith("SYSTEM_") || data.type.startsWith("CRON_") || data.type.startsWith("EXTERNAL_API_")) {
              invalidateApiCache(["/api/system"]);
            }

            // Gọi các callback đăng ký theo eventType cụ thể hoặc wildcard "*"
            const specificListeners = listenersRef.current.get(data.type);
            if (specificListeners) {
              specificListeners.forEach((cb) => cb(data));
            }
            const wildcardListeners = listenersRef.current.get("*");
            if (wildcardListeners) {
              wildcardListeners.forEach((cb) => cb(data));
            }
          } catch (parseErr) {
            // Heartbeat hoặc non-json comment
          }
        };

        es.onerror = () => {
          if (isDisposed) return;
          setIsConnected(false);
          if (es) {
            es.close();
            eventSourceRef.current = null;
          }
          // Thử kết nối lại sau 3 giây
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const subscribe = useCallback((eventTypes: string | string[], callback: (event: RealtimeEventData) => void) => {
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    types.forEach((type) => {
      if (!listenersRef.current.has(type)) {
        listenersRef.current.set(type, new Set());
      }
      listenersRef.current.get(type)!.add(callback);
    });

    return () => {
      types.forEach((type) => {
        listenersRef.current.get(type)?.delete(callback);
      });
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ isConnected, lastEvent, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
};

/**
 * Hook tiện ích đăng ký lắng nghe sự kiện Realtime cho từng màn hình
 * Tự động hủy đăng ký khi Component unmount (Chống memory leak)
 */
export function useRealtimeEvent(
  eventTypes: string | string[],
  callback: (event: RealtimeEventData) => void
) {
  const { subscribe } = useRealtime();
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const unsubscribe = subscribe(eventTypes, (event) => {
      cbRef.current(event);
    });
    return unsubscribe;
  }, [eventTypes, subscribe]);
}

