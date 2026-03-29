import { API_ENDPOINTS } from "@/constants";
import { API_BASE_URL } from "@/shared/api/client";
import type { OrderInfo } from "./types";

export function fetchRenewAdobeUserOrders(): Promise<OrderInfo[]> {
  return fetch(`${API_BASE_URL}${API_ENDPOINTS.RENEW_ADOBE_USER_ORDERS}`, {
    credentials: "include",
  }).then((res) => {
    if (!res.ok) {
      throw new Error("Lỗi tải user-orders");
    }

    return res.json() as Promise<OrderInfo[]>;
  });
}
