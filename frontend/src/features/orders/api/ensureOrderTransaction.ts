import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/shared/api/client";

export type EnsureOrderTransactionResult = {
  orderListId: number;
  idOrder: string;
  transaction: string;
  created: boolean;
};

export async function ensureOrderTransaction(
  orderListId: number
): Promise<EnsureOrderTransactionResult> {
  const response = await apiFetch(
    API_ENDPOINTS.ORDER_ENSURE_TRANSACTION(orderListId),
    { method: "POST" }
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      String((body as { error?: string })?.error || "Không thể tạo mã transaction.")
    );
  }
  return body as EnsureOrderTransactionResult;
}
