import type { CatalogProduct } from "../types";

export const ORDER_PREFIX = {
  MAVC: "MAVC", // CTV
  MAVL: "MAVL", // Bán lẻ
  MAVN: "MAVN", // Nhập kho / NCC
  MAVK: "MAVK", // Khuyến mãi
  MAVS: "MAVS", // Sinh viên
  MAVT: "MAVT", // Quà tặng
} as const;

export type OrderPrefixKey = typeof ORDER_PREFIX[keyof typeof ORDER_PREFIX];

export interface PrefixConfig {
  prefix: string;
  label: string;
  shortLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  leftBorder: string;
  glow: string;
  resolvePrice: (prod: CatalogProduct) => number;
}

export const ORDER_PREFIX_CONFIGS: Record<string, PrefixConfig> = {
  [ORDER_PREFIX.MAVC]: {
    prefix: ORDER_PREFIX.MAVC,
    label: "Đơn Cộng Tác Viên (CTV)",
    shortLabel: "CTV",
    badgeBg: "bg-cyan-500/15",
    badgeText: "text-cyan-300 font-extrabold",
    badgeBorder: "border-cyan-500/40",
    leftBorder: "border-l-cyan-500",
    glow: "shadow-cyan-500/10",
    resolvePrice: (prod) => (prod.ctv_price > 0 ? prod.ctv_price : (prod.retail_price > 0 ? prod.retail_price : prod.base_price)),
  },
  [ORDER_PREFIX.MAVL]: {
    prefix: ORDER_PREFIX.MAVL,
    label: "Đơn Bán Lẻ",
    shortLabel: "Bán Lẻ",
    badgeBg: "bg-purple-500/15",
    badgeText: "text-purple-300 font-extrabold",
    badgeBorder: "border-purple-500/40",
    leftBorder: "border-l-purple-500",
    glow: "shadow-purple-500/10",
    resolvePrice: (prod) => (prod.retail_price > 0 ? prod.retail_price : (prod.ctv_price > 0 ? prod.ctv_price : prod.base_price)),
  },
  [ORDER_PREFIX.MAVN]: {
    prefix: ORDER_PREFIX.MAVN,
    label: "Đơn Nhập Kho (NCC)",
    shortLabel: "Nhập Kho",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-300 font-extrabold",
    badgeBorder: "border-emerald-500/40",
    leftBorder: "border-l-emerald-500",
    glow: "shadow-emerald-500/10",
    resolvePrice: (prod) => (prod.base_price > 0 ? prod.base_price : 0),
  },
  [ORDER_PREFIX.MAVK]: {
    prefix: ORDER_PREFIX.MAVK,
    label: "Đơn Khuyến Mãi",
    shortLabel: "Khuyến Mãi",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-300 font-extrabold",
    badgeBorder: "border-amber-500/40",
    leftBorder: "border-l-amber-500",
    glow: "shadow-amber-500/10",
    resolvePrice: (prod) => (prod.promo_price > 0 ? prod.promo_price : (prod.retail_price > 0 ? prod.retail_price : prod.base_price)),
  },
  [ORDER_PREFIX.MAVS]: {
    prefix: ORDER_PREFIX.MAVS,
    label: "Đơn Sinh Viên",
    shortLabel: "Sinh Viên",
    badgeBg: "bg-rose-500/15",
    badgeText: "text-rose-300 font-extrabold",
    badgeBorder: "border-rose-500/40",
    leftBorder: "border-l-rose-500",
    glow: "shadow-rose-500/10",
    resolvePrice: (prod) => (prod.student_price > 0 ? prod.student_price : (prod.ctv_price > 0 ? prod.ctv_price : (prod.retail_price > 0 ? prod.retail_price : prod.base_price))),
  },
  [ORDER_PREFIX.MAVT]: {
    prefix: ORDER_PREFIX.MAVT,
    label: "Đơn Quà Tặng",
    shortLabel: "Quà Tặng",
    badgeBg: "bg-indigo-500/15",
    badgeText: "text-indigo-300 font-extrabold",
    badgeBorder: "border-indigo-500/40",
    leftBorder: "border-l-indigo-500",
    glow: "shadow-indigo-500/10",
    resolvePrice: () => 0,
  },
};

export const DEFAULT_PREFIX_CONFIG: PrefixConfig = {
  prefix: ORDER_PREFIX.MAVC,
  label: "Đơn Hàng Mặc Định",
  shortLabel: "Mặc Định",
  badgeBg: "bg-slate-800/80",
  badgeText: "text-slate-300",
  badgeBorder: "border-slate-700/80",
  leftBorder: "border-l-slate-700",
  glow: "shadow-slate-900/50",
  resolvePrice: (prod) => (prod ? (prod.retail_price > 0 ? prod.retail_price : prod.base_price) : 0),
};

export function getOrderPrefixConfig(idOrder?: string): PrefixConfig {
  if (!idOrder) return DEFAULT_PREFIX_CONFIG;
  const upper = String(idOrder).trim().toUpperCase();
  for (const prefixKey of Object.keys(ORDER_PREFIX_CONFIGS)) {
    if (upper.startsWith(prefixKey)) {
      return ORDER_PREFIX_CONFIGS[prefixKey];
    }
  }
  return DEFAULT_PREFIX_CONFIG;
}

export function resolvePriceByPrefix(prod: CatalogProduct, prefix: string): number {
  if (!prod) return 0;
  const upper = String(prefix || "").trim().toUpperCase();
  const config = ORDER_PREFIX_CONFIGS[upper];
  if (config) {
    return config.resolvePrice(prod);
  }
  return prod.retail_price > 0 ? prod.retail_price : prod.base_price;
}
