import type { Order } from "@/constants";
import { apiGet } from "@/lib/api";

export const TAX_ORDER_START_DATE = "2026-04-22";
const TAX_ORDER_PREFIXES = ["MAVC", "MAVL", "MAVK", "MAVS"];

export type TaxOrder = Pick<
  Order,
  | "id"
  | "id_order"
  | "id_product"
  | "product_display_name"
  | "order_date"
  | "registration_date"
  | "registration_date_display"
  | "days"
  | "price"
  | "cost"
  | "status"
  | "canceled_at"
> & {
  created_at?: string | null;
  created_at_raw?: string | null;
  /** Tiền hoàn trên đơn (DB `order_list.refund`). */
  refund?: string | number | null;
};

export const fetchTaxOrders = (
  from: string = TAX_ORDER_START_DATE
): Promise<TaxOrder[]> =>
  apiGet<TaxOrder[]>(`/api/orders/tax?from=${encodeURIComponent(from)}`);

const normalizeYmd = (value: unknown) => {
  if (value == null) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
};

const getTaxOrderDate = (order: TaxOrder) =>
  normalizeYmd(order.created_at_raw || order.created_at) ||
  normalizeYmd(order.registration_date || order.order_date);

const isTaxOrderCode = (order: TaxOrder) => {
  const orderCode = String(order.id_order || "").trim().toUpperCase();
  return TAX_ORDER_PREFIXES.some((prefix) => orderCode.startsWith(prefix));
};

export const fetchTaxOrdersWithFallback = async (
  from: string = TAX_ORDER_START_DATE
): Promise<TaxOrder[]> => {
  try {
    return await fetchTaxOrders(from);
  } catch (error) {
    const legacyOrders = await apiGet<TaxOrder[]>("/api/orders");
    return legacyOrders.filter((order) => {
      const orderDate = getTaxOrderDate(order);
      return orderDate >= from && isTaxOrderCode(order);
    });
  }
};
