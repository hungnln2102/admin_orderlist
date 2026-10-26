import { ORDER_STATUS } from "./constants/orderStatus";
import { ORDER_PREFIX } from "./constants/orderPrefix";
import { parsePackageDuration, parseDateToMidnight } from "./utils/durationUtils";

export interface Order {
  id: number;
  id_order: string;
  id_product?: number | string;
  variant_name?: string;
  display_name?: string;
  customer: string;
  contact: string;
  information_order: string;
  slot?: string;
  price: number;
  gross_selling_price?: number;
  cost?: number;
  supply_id?: number | string;
  supplier_name?: string;
  status: string;
  payment_method?: string;
  note?: string;
  created_at?: string;
  order_date?: string;
  expired_at?: string;
  days?: number | string;
  refund?: string;
  transaction?: string;
  vietqr_url?: string;
  bank_info?: {
    bank_name?: string;
    bank_bin?: string;
    account_number?: string;
    account_holder?: string;
    type?: string;
  };
}

export type OrderDatasetKey = "active" | "import" | "expired" | "canceled";

export interface OrdersPageProps {
  initialTab?: OrderDatasetKey;
}

export interface OrderFormData {
  customer: string;
  contact: string;
  information_order: string;
  slot: string;
  id_product: string;
  variant_name?: string;
  display_name?: string;
  supply_id: string;
  price: number;
  gross_selling_price: number;
  cost: number;
  status: string;
  payment_method: string;
  note: string;
  days: number;
  order_date: string;
  expired_at: string;
  order_prefix: string;
  save_to_warehouse?: boolean;
  save_to_package?: boolean;
  package_slots?: number;
  package_match_rule?: string;
  storage_account_username?: string;
  storage_total?: string;
}

export const DEFAULT_FORM_DATA: OrderFormData = {
  customer: "",
  contact: "",
  information_order: "",
  slot: "",
  id_product: "",
  supply_id: "",
  price: 150000,
  gross_selling_price: 150000,
  cost: 0,
  status: ORDER_STATUS.UNPAID,
  payment_method: "bank",
  note: "",
  days: 365,
  order_date: "",
  expired_at: "",
  order_prefix: ORDER_PREFIX.MAVC,
  save_to_warehouse: true,
  save_to_package: true,
  package_slots: 2,
  package_match_rule: "information",
};

export interface CatalogProduct {
  id: number;
  san_pham: string;
  package_product: string;
  base_price: number;
  retail_price: number;
  ctv_price: number;
  student_price: number;
  promo_price: number;
  is_active: boolean;
}

export interface CatalogSupplierCost {
  id: number;
  variant_id: number;
  supplier_id: number;
  supplier_name: string;
  ncc_name?: string;
  number_bank?: string;
  price: number;
  gia_nhap?: number;
}

export interface CatalogSupplier {
  id: number;
  supplier_name: string;
  ncc_name?: string;
  number_bank?: string;
}

// Global Helper functions for Orders
export function calculateRemainingDays(order: Order): number {
  if (
    order.status === ORDER_STATUS.CANCELED ||
    order.status === ORDER_STATUS.REFUNDED ||
    order.status === ORDER_STATUS.REFUND_PENDING
  )
    return 0;

  if (order.expired_at) {
    const expiry = parseDateToMidnight(order.expired_at);
    if (expiry) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
  }
  return Number(order.days || 0);
}

export function calculateRemainingValue(order: Order): number {
  const remainingDays = calculateRemainingDays(order);
  if (remainingDays <= 0) return 0;
  const price = Number(order.price || 0);
  const totalDays = Number(order.days || 365);
  if (totalDays <= 0) return 0;
  return Math.max(0, Math.round((price / totalDays) * remainingDays));
}

export function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return "—";
  const str = String(dateStr).trim();
  if (!str) return "—";

  // Nếu là ISO timestamp có giờ (ví dụ 2026-10-24T17:00:00.000Z)
  if (str.includes("T") || str.includes(":")) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  // Nếu là chuỗi ngày thuần túy YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-");
    return `${d}/${m}/${y}`;
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getDisplayProductName(
  idProduct?: number | string,
  productsCatalog: CatalogProduct[] = [],
  fallbackName?: string
): string {
  if (!idProduct && !fallbackName) return "";
  const str = String(idProduct || "").trim();

  const pId = Number(str);
  let variantName = "";
  let rawName = str;

  if (!isNaN(pId) && pId > 0) {
    const found = productsCatalog.find((p) => Number(p.id) === pId || String(p.id) === str);
    if (found) {
      variantName = found.package_product || found.san_pham;
      rawName = `${found.package_product || found.san_pham} ${found.san_pham !== found.package_product ? found.san_pham : ""}`;
    }
  } else if (str) {
    const found = productsCatalog.find(
      (p) =>
        (p.package_product && p.package_product.toLowerCase() === str.toLowerCase()) ||
        p.san_pham.toLowerCase() === str.toLowerCase()
    );
    if (found) {
      variantName = found.package_product || found.san_pham;
      rawName = `${found.package_product || found.san_pham} ${found.san_pham !== found.package_product ? found.san_pham : ""}`;
    } else {
      variantName = str;
    }
  }

  // Nếu không tìm thấy tên biến thể hoặc kết quả là số thuần túy (ID chưa khớp catalog)
  if (!variantName || /^\d+$/.test(variantName)) {
    if (fallbackName && fallbackName.trim() && !/^\d+$/.test(fallbackName)) return fallbackName.trim();
    if (/^\d+$/.test(str)) return `Sản phẩm #${str}`;
  }

  const { durationText } = parsePackageDuration(rawName);
  if (durationText && variantName) {
    if (variantName.toLowerCase().includes(durationText.toLowerCase())) {
      return variantName;
    }
    return `${variantName} (${durationText})`;
  }

  return variantName || fallbackName || str;
}

