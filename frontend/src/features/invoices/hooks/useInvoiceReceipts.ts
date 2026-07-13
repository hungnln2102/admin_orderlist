import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/api/client";
import type { MatchableOrder, PaymentReceipt } from "../helpers";
import { normalizeReceiptRow } from "../utils/receiptMapper";

const normalizeMatchableOrders = (ordersRaw: Partial<MatchableOrder>[]): MatchableOrder[] =>
  ordersRaw
    .map((item) => ({
      id: Number(item?.id) || 0,
      orderCode: String(item?.orderCode || "").trim().toUpperCase(),
      transaction: String(item?.transaction || "").trim().toUpperCase(),
      status: String(item?.status || ""),
      customer: String(item?.customer || ""),
      informationOrder: String(item?.informationOrder || ""),
    }))
    .filter((item) => item.orderCode);

export function useInvoiceReceipts() {
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [matchableOrders, setMatchableOrders] = useState<MatchableOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        setLoading(true);
        setError(null);
        const [receiptsResponse, ordersResponse] = await Promise.all([
          apiFetch("/api/payment-receipts"),
          apiFetch("/api/payment-receipts/matchable-orders?limit=500"),
        ]);
        if (!receiptsResponse.ok) {
          throw new Error("Không thể tải biên nhận.");
        }

        const data = await receiptsResponse.json();
        const rawList = Array.isArray(data?.receipts)
          ? data.receipts
          : Array.isArray(data)
          ? data
          : [];
        setReceipts(rawList.map(normalizeReceiptRow));

        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          const ordersRaw = Array.isArray(ordersData?.orders)
            ? ordersData.orders
            : Array.isArray(ordersData)
            ? ordersData
            : [];
          setMatchableOrders(normalizeMatchableOrders(ordersRaw));
        } else {
          setMatchableOrders([]);
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Không thể tải biên nhận.");
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, []);

  return { receipts, setReceipts, matchableOrders, loading, error, setError };
}
