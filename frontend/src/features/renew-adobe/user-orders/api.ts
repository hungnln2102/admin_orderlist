import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/lib/api";
import type { OrderInfo } from "./types";

export function fetchRenewAdobeUserOrders(): Promise<OrderInfo[]> {
  return apiFetch(API_ENDPOINTS.RENEW_ADOBE_USER_ORDERS).then((res) => {
    if (!res.ok) {
      throw new Error("Lỗi tải user-orders");
    }

    return res.json() as Promise<OrderInfo[]>;
  });
}

/** Đơn từ order_list match renew_adobe (variant + status), kèm cờ in_tracking. */
export type MatchableOrder = {
  order_code: string;
  customer: string | null;
  contact: string | null;
  information_order: string | null;
  expiry_date: string | null;
  status: string | null;
  in_tracking: boolean;
};

export async function fetchMatchableOrders(params?: {
  q?: string;
  excludeTracked?: boolean;
}): Promise<MatchableOrder[]> {
  const search = new URLSearchParams();
  const q = params?.q?.trim();
  if (q) search.set("q", q);
  if (params?.excludeTracked) search.set("exclude_tracked", "true");
  const qs = search.toString();
  const url = qs
    ? `${API_ENDPOINTS.RENEW_ADOBE_ORDER_LIST_MATCH}?${qs}`
    : API_ENDPOINTS.RENEW_ADOBE_ORDER_LIST_MATCH;
  const res = await apiFetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string })?.error || `HTTP ${res.status}`
    );
  }
  const data = (await res.json()) as { items?: MatchableOrder[] };
  return Array.isArray(data?.items) ? data.items : [];
}

import type { AdobeSystemCode } from "./system-options";

export type AddOrdersToTrackingResult = {
  upserted: number;
  requested: number;
  accepted: number;
  skipped: string[];
  system_note?: AdobeSystemCode;
};

export async function addOrdersToTracking(
  orderIds: string[],
  systemNote?: AdobeSystemCode
): Promise<AddOrdersToTrackingResult> {
  const res = await apiFetch(API_ENDPOINTS.RENEW_ADOBE_USER_ORDERS_TRACK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_ids: orderIds,
      ...(systemNote ? { system_note: systemNote } : {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string })?.error ||
        `Không thêm được đơn vào tracking (HTTP ${res.status}).`
    );
  }
  return data as AddOrdersToTrackingResult;
}

export async function updateTrackingOrder(
  orderCode: string,
  payload: { systemNote?: AdobeSystemCode }
): Promise<{ ok: boolean; orderCode: string; updated_count: number }> {
  const body: Record<string, unknown> = {};
  if (payload.systemNote) body.system_note = payload.systemNote;
  const res = await apiFetch(
    API_ENDPOINTS.RENEW_ADOBE_USER_ORDERS_BY_CODE(orderCode),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string })?.error ||
        `Không cập nhật được đơn ${orderCode} (HTTP ${res.status}).`
    );
  }
  return data as { ok: boolean; orderCode: string; updated_count: number };
}

export async function deleteTrackingOrder(
  orderCode: string
): Promise<{ ok: boolean; orderCode: string; removed: number }> {
  const res = await apiFetch(
    API_ENDPOINTS.RENEW_ADOBE_USER_ORDERS_BY_CODE(orderCode),
    {
      method: "DELETE",
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string })?.error ||
        `Không xoá được đơn ${orderCode} (HTTP ${res.status}).`
    );
  }
  return data as { ok: boolean; orderCode: string; removed: number };
}
