import { API_ENDPOINTS } from "@/constants";
import { apiGet } from "./api";

export type AvailableRefundCredit = {
  id: number | string;
  credit_code: string;
  customer_name: string | null;
  customer_contact: string | null;
  available_amount: number;
  /** Tiền hoàn gốc ghi trên phiếu, dùng hiển thị tham chiếu cạnh "đơn cục". */
  refund_amount?: number;
  source_order_code: string;
  source_order_list_id: number | string | null;
  status: string;
};

type ListResponse = { data?: AvailableRefundCredit[] };

export async function fetchAvailableRefundCredits(): Promise<AvailableRefundCredit[]> {
  const body = await apiGet<ListResponse>(API_ENDPOINTS.ORDERS_REFUND_CREDITS_AVAILABLE);
  return Array.isArray(body?.data) ? body.data : [];
}
