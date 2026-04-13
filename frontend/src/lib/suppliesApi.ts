import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "./api";

export interface SupplyOrderCostRow {
  orderPk: number;
  idOrder: string;
  supplierName: string;
  cost: number;
  refund: number;
  /** Chưa Thanh Toán / Đã Thanh Toán — theo đơn (order_list.status). */
  nccPaymentStatus?: string;
  orderDate: string | null;
  canceledAt: string | null;
}

export interface SupplyOrderCostAggregates {
  orderCount: number;
  totalCost: number;
  totalRefund: number;
}

export interface SupplyOrderCostsResponse {
  rows: SupplyOrderCostRow[];
  total: number;
  limit: number;
  offset: number;
  aggregates: SupplyOrderCostAggregates;
}

export const fetchSupplyOrderCosts = async (params: {
  limit?: number;
  offset?: number;
  supplyId?: number | null;
  q?: string;
}): Promise<SupplyOrderCostsResponse> => {
  const sp = new URLSearchParams();
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.offset != null) sp.set("offset", String(params.offset));
  if (params.supplyId != null && Number.isFinite(params.supplyId)) {
    sp.set("supply_id", String(params.supplyId));
  }
  if (params.q != null && params.q.trim() !== "") {
    sp.set("q", params.q.trim());
  }
  const qs = sp.toString();
  const url = qs
    ? `${API_ENDPOINTS.SUPPLIES_ORDER_COSTS}?${qs}`
    : API_ENDPOINTS.SUPPLIES_ORDER_COSTS;
  const response = await apiFetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Không thể tải danh sách chi phí NCC.");
  }
  return response.json() as Promise<SupplyOrderCostsResponse>;
};

export interface SupplyDeleteResponse {
  success: boolean;
  message?: string;
}

export const deleteSupplyById = async (
  supplyId: number
): Promise<SupplyDeleteResponse> => {
  const response = await apiFetch(`/api/supplies/${supplyId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (response.status === 404) {
    return { success: true, message: "Nguồn đã được xóa trước đó." };
  }
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Không thể xóa nguồn.");
  }
  const data = await response.json().catch(() => null);
  if (data && typeof data.success === "boolean") {
    return data;
  }
  return { success: true };
};