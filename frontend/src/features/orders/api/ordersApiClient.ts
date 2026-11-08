import { apiClient } from "@/shared/api/apiClient";
import { apiEndpoints } from "@/shared/api/apiEndpoints";
import type { Order, OrdersQuery } from "../types";

export interface OrdersListResponse {
  data: Order[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  tabCounts?: {
    active: number;
    import: number;
    expired: number;
    canceled: number;
  };
  summary?: any;
}

export const ordersApiClient = {
  async getOrders(query: OrdersQuery = {}): Promise<OrdersListResponse> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.search) params.set("search", query.search);
    if (query.status) params.set("status", query.status);
    if (query.tab) params.set("tab", query.tab);
    if (query.includeStats !== undefined) params.set("includeStats", String(query.includeStats));

    const queryString = params.toString();
    const url = queryString ? `${apiEndpoints.orders}?${queryString}` : apiEndpoints.orders;
    const res = await apiClient(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Lỗi lấy danh sách đơn (${res.status})`);
    }
    return res.json();
  },

  async getOrderById(id: number | string): Promise<Order> {
    const res = await apiClient(apiEndpoints.orderDetail(id));
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Lỗi lấy chi tiết đơn (${res.status})`);
    }
    return res.json();
  },

  async createOrder(payload: Partial<Order> | Record<string, any>): Promise<Order> {
    const res = await apiClient(apiEndpoints.orders, {
      method: "POST",
      body: payload,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Không thể tạo đơn hàng");
    }
    return data;
  },

  async updateOrder(id: number | string, payload: Partial<Order> | Record<string, any>): Promise<Order> {
    const res = await apiClient(apiEndpoints.orderDetail(id), {
      method: "PUT",
      body: payload,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Không thể cập nhật đơn hàng");
    }
    return data;
  },

  async deleteOrder(id: number | string): Promise<{ success: boolean; id: string | number }> {
    const res = await apiClient(apiEndpoints.orderDetail(id), {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Không thể xóa đơn hàng");
    }
    return data;
  },

  async processOrder(id: number | string): Promise<Order> {
    const res = await apiClient(apiEndpoints.orderProcess(id), {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Không thể chuyển trạng thái đang xử lý");
    }
    return data;
  },

  async completeOrder(id: number | string): Promise<Order> {
    const res = await apiClient(apiEndpoints.orderComplete(id), {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Không thể hoàn thành đơn hàng");
    }
    return data;
  },

  async renewOrder(id: number | string, payload?: Partial<Order> | Record<string, any>): Promise<Order> {
    const res = await apiClient(apiEndpoints.orderRenew(id), {
      method: "POST",
      body: payload || {},
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Không thể gia hạn đơn hàng");
    }
    return data;
  },

  async payOrderWithCredit(id: number | string, creditNoteId: number | string): Promise<Order> {
    const res = await apiClient(apiEndpoints.orderPayCredit(id), {
      method: "POST",
      body: { credit_note_id: creditNoteId },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Không thể thanh toán bằng credit");
    }
    return data;
  },
};

