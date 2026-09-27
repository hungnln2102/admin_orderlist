export interface Order {
  id: number;
  id_order: string;
  id_product?: number | string;
  customer: string;
  contact: string;
  information_order: string;
  slot?: string;
  price: number;
  gross_selling_price?: number;
  cost?: number;
  supply_id?: number | string;
  status: string;
  payment_method?: string;
  note?: string;
  created_at?: string;
  order_date?: string;
  expired_at?: string;
  days?: number | string;
  refund?: string;
  transaction?: string;
}

export type OrderDatasetKey = "active" | "import" | "expired" | "canceled";

export interface OrdersPageProps {
  initialTab?: OrderDatasetKey;
}

export const DEFAULT_FORM_DATA = {
  customer: "",
  contact: "",
  information_order: "",
  slot: "",
  id_product: "",
  supply_id: "",
  price: 150000,
  gross_selling_price: 150000,
  cost: 0,
  status: "Chưa Thanh Toán",
  payment_method: "bank",
  note: "",
  days: 365,
  order_date: "",
  expired_at: "",
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
  if (order.status === "Đã Hủy" || order.status === "Hủy" || order.status === "Đã Hoàn") return 0;
  if (order.expired_at) {
    let expiry: Date | null = null;
    const str = String(order.expired_at).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split("-").map(Number);
      expiry = new Date(y, m - 1, d);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const [d, m, y] = str.split("/").map(Number);
      expiry = new Date(y, m - 1, d);
    } else {
      const parsed = new Date(order.expired_at);
      if (!isNaN(parsed.getTime())) {
        expiry = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      }
    }

    if (expiry) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiry.setHours(0, 0, 0, 0);
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
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.substring(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getDisplayProductName(idProduct?: number | string, productsCatalog: CatalogProduct[] = []): string {
  if (!idProduct) return "";
  const str = String(idProduct).trim();
  if (!str) return "";

  const parseDurationText = (text: string): string => {
    if (!text) return "";
    const lower = text.toLowerCase();
    const matchM = lower.match(/--(\d+)m/i) || lower.match(/(\d+)\s*(tháng|month|m\b)/i);
    const matchY = lower.match(/--(\d+)y/i) || lower.match(/(\d+)\s*(năm|year|y\b)/i);

    if (matchM && Number(matchM[1]) > 0) {
      const months = Number(matchM[1]);
      return `${months} tháng`;
    }
    if (matchY && Number(matchY[1]) > 0) {
      const years = Number(matchY[1]);
      return `${years} năm`;
    }
    return "";
  };

  const pId = Number(str);
  let variantName = "";
  let rawName = str;

  if (!isNaN(pId) && pId > 0) {
    const found = productsCatalog.find((p) => p.id === pId);
    if (found) {
      variantName = found.package_product || found.san_pham;
      rawName = `${found.san_pham} ${found.package_product || ""}`;
    }
  } else {
    const found = productsCatalog.find(
      (p) => p.san_pham.toLowerCase() === str.toLowerCase() || (p.package_product && p.package_product.toLowerCase() === str.toLowerCase())
    );
    if (found) {
      variantName = found.package_product || found.san_pham;
      rawName = `${found.san_pham} ${found.package_product || ""}`;
    } else {
      variantName = str;
    }
  }

  const durationStr = parseDurationText(rawName);
  if (durationStr) {
    if (variantName.toLowerCase().includes(durationStr.toLowerCase())) {
      return variantName;
    }
    return `${variantName} (${durationStr})`;
  }

  return variantName || str;
}

export function getOrderPrefixConfig(idOrder?: string) {
  if (!idOrder) {
    return {
      prefix: "MAV",
      badgeBg: "bg-slate-800/80",
      badgeText: "text-slate-300",
      badgeBorder: "border-slate-700/80",
      leftBorder: "border-l-slate-700",
      glow: "shadow-slate-900/50",
    };
  }
  const upper = idOrder.toUpperCase();
  if (upper.startsWith("MAVC")) {
    return {
      prefix: "MAVC",
      badgeBg: "bg-cyan-500/15",
      badgeText: "text-cyan-300 font-extrabold",
      badgeBorder: "border-cyan-500/40",
      leftBorder: "border-l-cyan-500",
      glow: "shadow-cyan-500/10",
    };
  }
  if (upper.startsWith("MAVL")) {
    return {
      prefix: "MAVL",
      badgeBg: "bg-purple-500/15",
      badgeText: "text-purple-300 font-extrabold",
      badgeBorder: "border-purple-500/40",
      leftBorder: "border-l-purple-500",
      glow: "shadow-purple-500/10",
    };
  }
  if (upper.startsWith("MAVN")) {
    return {
      prefix: "MAVN",
      badgeBg: "bg-emerald-500/15",
      badgeText: "text-emerald-300 font-extrabold",
      badgeBorder: "border-emerald-500/40",
      leftBorder: "border-l-emerald-500",
      glow: "shadow-emerald-500/10",
    };
  }
  if (upper.startsWith("MAVK")) {
    return {
      prefix: "MAVK",
      badgeBg: "bg-amber-500/15",
      badgeText: "text-amber-300 font-extrabold",
      badgeBorder: "border-amber-500/40",
      leftBorder: "border-l-amber-500",
      glow: "shadow-amber-500/10",
    };
  }
  if (upper.startsWith("MAVS")) {
    return {
      prefix: "MAVS",
      badgeBg: "bg-rose-500/15",
      badgeText: "text-rose-300 font-extrabold",
      badgeBorder: "border-rose-500/40",
      leftBorder: "border-l-rose-500",
      glow: "shadow-rose-500/10",
    };
  }
  return {
    prefix: "MAV",
    badgeBg: "bg-indigo-500/15",
    badgeText: "text-indigo-300 font-extrabold",
    badgeBorder: "border-indigo-500/40",
    leftBorder: "border-l-indigo-500",
    glow: "shadow-indigo-500/10",
  };
}
