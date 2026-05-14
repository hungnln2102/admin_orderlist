import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "./api";

export type AvailableRefundCredit = {
  id: number;
  credit_code: string;
  customer_name: string | null;
  customer_contact: string | null;
  available_amount: number;
  /** Tiền hoàn gốc ghi trên phiếu — dùng hiển thị tham chiếu cạnh “đơn cũ”. */
  refund_amount?: number;
  source_order_code: string;
  source_order_list_id: number | null;
  status: string;
};

type ListResponse = { data?: AvailableRefundCredit[] };

export const fetchAvailableRefundCredits = async (): Promise<
  AvailableRefundCredit[]
> => {
  const res = await apiFetch(API_ENDPOINTS.ORDERS_REFUND_CREDITS_AVAILABLE);
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || "Không tải danh sách credit.");
  }
  const body = (await res.json().catch(() => ({}))) as ListResponse;
  return Array.isArray(body.data) ? body.data : [];
};
