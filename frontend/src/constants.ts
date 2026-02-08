import {
  ORDER_FIELD_MAP,
  ORDER_EXPIRED_FIELD_MAP,
  VARIANT_PRICING_FIELD_MAP,
  SUPPLY_FIELD_MAP,
  SUPPLY_PRICE_FIELD_MAP,
  PAYMENT_RECEIPT_FIELD_MAP,
  PURCHASE_ORDER_FIELD_MAP,
  REFUND_FIELD_MAP,
  BANK_LIST_FIELD_MAP,
  WAREHOUSE_FIELD_MAP,
  CATEGORY_FIELD_MAP,
  PRODUCT_FIELD_MAP,
  VARIANT_FIELD_MAP,
  PRODUCT_SCHEMA_DESC_FIELD_MAP,
  PRICE_CONFIG_FIELD_MAP,
  SUPPLIER_COST_FIELD_MAP,
} from "./lib/fieldMapper";
import { ORDER_STATUS } from "@shared/orderStatuses";

export const API_ENDPOINTS = {
  ORDERS: "/api/orders",
  ORDER_BY_ID: (id: number) => `/api/orders/${id}`,
  ORDER_RENEW: (orderCode: string) =>
    `/api/orders/${encodeURIComponent(orderCode)}/renew`,
  ORDER_EXPRIED: "/api/orders/expired",
  ORDERS_EXPIRED: "/api/orders/expired",
  ORDERS_CANCELED: "/api/orders/canceled",
  ORDER_CANCELED_REFUND: (id: number) => `/api/orders/canceled/${id}/refund`,

  SUPPLIES: "/api/supplies",
  PRODUCTS_BY_SUPPLY: (supplyId: number) =>
    `/api/supplies/${supplyId}/products`,

  CALCULATE_PRICE: "/api/orders/calculate-price",

  PRODUCTS_ALL: "/api/products",
  PRODUCT_DESCRIPTIONS: "/api/product-descriptions",
  PRODUCT_PRICES: "/api/product-prices",
  PRODUCT_PRICE_DETAIL: (productId: number) =>
    `/api/product-prices/${productId}`,

  SUPPLIES_BY_PRODUCT: (productName: string) =>
    `/api/products/supplies-by-name/${encodeURIComponent(productName)}`,
  SUPPLY_PRICES_BY_PRODUCT_NAME: (productName: string) =>
    `/api/products/all-prices-by-name/${encodeURIComponent(productName)}`,

  UPDATE_SUPPLY_PRICE: (productId: number, sourceId: number) =>
    `/api/products/${productId}/suppliers/${sourceId}/price`,
  CREATE_SUPPLY_PRICE: (productId: number) =>
    `/api/product-prices/${productId}/suppliers`,
  DELETE_SUPPLY_PRICE: (productId: number, sourceId: number) =>
    `/api/products/${productId}/suppliers/${sourceId}`,

  PAYMENT_RECEIPTS: "/api/payment-receipts",
  PURCHASE_ORDERS: "/api/purchase-orders",
  REFUNDS: "/api/refunds",
  BANK_LIST: "/api/banks",
  WAREHOUSE: "/api/warehouse",
};

// Keep UI aliases stable; values now sourced from tableSql via fieldMapper.
export const ORDER_FIELDS = ORDER_FIELD_MAP;
// Typo kept for backward compatibility with existing imports.
export const ORDER_EXPRIED_FIELDS = ORDER_EXPIRED_FIELD_MAP;
export const VARIANT_PRICING_FIELDS = VARIANT_PRICING_FIELD_MAP;
export const SUPPLY_FIELDS = SUPPLY_FIELD_MAP;
export const SUPPLY_PRICE_FIELDS = SUPPLY_PRICE_FIELD_MAP;
export const PAYMENT_RECEIPT_FIELDS = PAYMENT_RECEIPT_FIELD_MAP;
export const PURCHASE_ORDER_FIELDS = PURCHASE_ORDER_FIELD_MAP;
export const REFUND_FIELDS = REFUND_FIELD_MAP;
export const BANK_LIST_FIELDS = BANK_LIST_FIELD_MAP;
export const WAREHOUSE_FIELDS = WAREHOUSE_FIELD_MAP;
export const CATEGORY_FIELDS = CATEGORY_FIELD_MAP;
export const PRODUCT_FIELDS = PRODUCT_FIELD_MAP;
export const VARIANT_FIELDS = VARIANT_FIELD_MAP;
export const PRODUCT_SCHEMA_DESC_FIELDS = PRODUCT_SCHEMA_DESC_FIELD_MAP;
export const PRICE_CONFIG_FIELDS = PRICE_CONFIG_FIELD_MAP;
export const SUPPLIER_COST_FIELDS = SUPPLIER_COST_FIELD_MAP;

export const VIRTUAL_FIELDS = {
  SO_NGAY_CON_LAI: "so_ngay_con_lai_virtual",
  GIA_TRI_CON_LAI: "gia_tri_con_lai_virtual",
  TRANG_THAI_TEXT: "trang_thai_text_virtual",
  ORDER_DATE_DISPLAY: "order_date_display_virtual",
  EXPIRY_DATE_DISPLAY: "expiry_date_display_virtual",
};

export const CALCULATED_FIELDS = {
  COST: "cost",
  PRICE: "price",
  DAYS: "days",
  ORDER_EXPIRED: "order_expired",
};

export const ORDER_CODE_PREFIXES = {
  COLLABORATOR: "MAVC",
  RETAIL: "MAVL",
  PROMO: "MAVK",
  GIFT: "MAVT",
  IMPORT: "MAVN",
  STUDENT: "MAVS",
} as const;

export const DEFAULT_ORDER_CODE_PREFIX = ORDER_CODE_PREFIXES.COLLABORATOR;

export const ORDER_CODE_OPTIONS = [
  {
    value: ORDER_CODE_PREFIXES.COLLABORATOR,
    label: "Cộng Tác Viên",
  },
  { value: ORDER_CODE_PREFIXES.STUDENT, label: "Sinh Viên" },
  { value: ORDER_CODE_PREFIXES.RETAIL, label: "Khách Lẻ" },
  { value: ORDER_CODE_PREFIXES.PROMO, label: "Khuyến Mãi" },
  { value: ORDER_CODE_PREFIXES.GIFT, label: "Quà Tặng" },
  { value: ORDER_CODE_PREFIXES.IMPORT, label: "Nhập Hàng" },
] as const;

export const ORDER_STATUSES = {
  ORDER_EXPIRED: ORDER_STATUS.EXPIRED,
  CAN_GIA_HAN: ORDER_STATUS.RENEWAL,
  CHUA_THANH_TOAN: ORDER_STATUS.UNPAID,
  DANG_XU_LY: ORDER_STATUS.PROCESSING,
  DA_THANH_TOAN: ORDER_STATUS.PAID,
  CHO_HOAN: ORDER_STATUS.PENDING_REFUND,
  DA_HOAN: ORDER_STATUS.REFUNDED,
};


export const STAT_CARD_ACCENTS = {
  sky: "sky",
  amber: "amber",
  rose: "rose",
  emerald: "emerald",
};

export const ORDER_DATASET_CONFIG = {
  active: {
    label: "Đơn Hàng",
    description: "Danh sách đơn đang hoạt động",
    endpoint: API_ENDPOINTS.ORDERS,
  },
  expired: {
    label: "Hết Hạn",
    description: "Danh sách các đơn hàng đã hết hạn",
    endpoint: API_ENDPOINTS.ORDERS_EXPIRED,
  },
  canceled: {
    label: "Hoàn Tiền",
    description: "Đơn đã hủy/hoàn tiền",
    endpoint: API_ENDPOINTS.ORDERS_CANCELED,
  },
};

export const ORDER_DATASET_SEQUENCE = ["active", "expired", "canceled"];

export type OrderDatasetKey = "active" | "expired" | "canceled";

export interface Order {
  id: number;
  id_order: string;
  id_product: string;
  information_order: string;
  customer: string;
  contact: string;
  slot: string;
  order_date: string;
  days: string;
  order_expired: string;
  registration_date?: string;
  expiry_date?: string;
  registration_date_display?: string;
  expiry_date_display?: string;
  supply: string;
  cost: string;
  price: string;
  note: string;
  status: string;
  can_hoan?: number | string;
  so_ngay_con_lai: number | null;

  [VIRTUAL_FIELDS.SO_NGAY_CON_LAI]: number;
  [VIRTUAL_FIELDS.GIA_TRI_CON_LAI]: number;
  [VIRTUAL_FIELDS.TRANG_THAI_TEXT]: string;
  [VIRTUAL_FIELDS.ORDER_DATE_DISPLAY]: string;
  [VIRTUAL_FIELDS.EXPIRY_DATE_DISPLAY]: string;
}

