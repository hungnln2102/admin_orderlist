import { VARIANT_PRICING_COLS } from "@/lib/tableSql";
import {
  getDiscountRatioInput,
  getMarginRatioInput,
  multiplyValue,
} from "@/shared/pricing";
import {
  CreateSupplierEntry,
  ProductPricingRow,
  RateDescriptionInput,
  SupplyPriceItem,
} from "./types";

export const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export const createSupplierEntry = (): CreateSupplierEntry => {
  const globalCrypto =
    typeof globalThis !== "undefined"
      ? (globalThis as { crypto?: Crypto }).crypto
      : null;
  const id =
    globalCrypto && typeof globalCrypto.randomUUID === "function"
      ? globalCrypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return {
    id,
    sourceId: null,
    sourceName: "",
    price: "",
    numberBank: "",
    bankBin: "",
    useCustomName: false,
  };
};

export const roundToNearestThousand = (value?: number | null): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(Math.abs(value) / 1000) * 1000;
  return value < 0 ? -rounded : rounded;
};

export const cleanupLabel = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  return String(value).replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
};

export const formatSkuLabel = (value: string): string => {
  if (!value) return "-";
  return value
    .replace(/[_]+/g, " ")
    .replace(/--/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const extractMonthsLabel = (sanPham: string): string | null => {
  if (!sanPham) return null;
  const match = sanPham.match(/(\d+)\s*m\b/i);
  if (!match) return null;
  const months = Number.parseInt(match[1], 10);
  if (!Number.isFinite(months) || months <= 0) return null;
  return `${months} Tháng`;
};

export const buildVariantLabel = (packageProduct: string, sanPham: string): string => {
  const monthsLabel = extractMonthsLabel(sanPham);
  if (packageProduct && monthsLabel) {
    return `${packageProduct} ${monthsLabel}`;
  }
  if (packageProduct) {
    return packageProduct;
  }
  return monthsLabel || formatSkuLabel(sanPham) || "Không Xác Định";
};

export const toNumberOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export const parseBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return false;
  return ["true", "1", "t", "y", "yes"].includes(normalized);
};

export { getMarginRatioInput, getDiscountRatioInput };

export const hasValidPromoRatio = (
  value?: number | null,
  _pctKhach?: number | null,
  _pctCtv?: number | null
): boolean => {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
};

const normalizeSupplyName = (value: string | null | undefined): string => {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

export const dedupeSupplyItems = (items: SupplyPriceItem[]): SupplyPriceItem[] => {
  const map = new Map<string, SupplyPriceItem>();
  for (const item of items) {
    const key =
      Number.isFinite(item.sourceId) && item.sourceId > 0
        ? `id:${item.sourceId}`
        : `name:${normalizeSupplyName(item.sourceName)}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      continue;
    }

    const existingPrice = existing.price ?? Number.POSITIVE_INFINITY;
    const candidatePrice = item.price ?? Number.POSITIVE_INFINITY;
    const existingDate = Date.parse(existing.lastOrderDate ?? "") || 0;
    const candidateDate = Date.parse(item.lastOrderDate ?? "") || 0;

    if (candidatePrice < existingPrice || (candidatePrice === existingPrice && candidateDate > existingDate)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
};

export const sortSupplyItems = (items: SupplyPriceItem[]): SupplyPriceItem[] => {
  return [...items].sort((a, b) => {
    const priceA = a.price ?? Number.POSITIVE_INFINITY;
    const priceB = b.price ?? Number.POSITIVE_INFINITY;
    if (priceA !== priceB) return priceA - priceB;
    const tsA = Date.parse(a.lastOrderDate ?? "") || 0;
    const tsB = Date.parse(b.lastOrderDate ?? "") || 0;
    if (tsA !== tsB) return tsB - tsA;
    return a.sourceName.localeCompare(b.sourceName);
  });
};

export const buildSupplyRowKey = (productId: number, sourceId: number): string => `${productId}-${sourceId}`;

export { multiplyValue };

export const multiplyBasePrice = (ratio?: number | null, basePrice?: number | null): number | null =>
  multiplyValue(basePrice, ratio);

/** Chỉ tính giá sinh viên khi pct_stu > 0; null/0/âm => không hiển thị giá. */
export const effectiveStudentMarginPct = (
  pctStu?: number | null,
  _pctKhach?: number | null
): number | null => {
  if (
    pctStu !== null &&
    pctStu !== undefined &&
    Number.isFinite(pctStu) &&
    pctStu > 0
  ) {
    return pctStu;
  }
  return null;
};

export const computeStudentPrice = (
  _wholesalePrice?: number | null,
  pctStu?: number | null,
  _pctKhach?: number | null
): number | null => {
  const direct = toNumberOrNull(pctStu);
  return typeof direct === "number" && direct > 0 ? direct : null;
};

export const calculatePromoPrice = (
  _pctKhach?: number | null,
  pctPromo?: number | null,
  _pctCtv?: number | null,
  _wholesalePrice?: number | null,
  _fallbackBasePrice?: number | null
): number | null => {
  const direct = toNumberOrNull(pctPromo);
  return typeof direct === "number" && direct > 0 ? direct : null;
};

export const applyBasePriceToProduct = (product: ProductPricingRow, basePrice: number | null): ProductPricingRow => {
  if (typeof basePrice !== "number" || !Number.isFinite(basePrice) || basePrice <= 0) {
    return product;
  }

  return {
    ...product,
    baseSupplyPrice: basePrice,
  };
};

export const formatVndInput = (raw: string): string => {
  const digits = (raw || "").replace(/\D+/g, "");
  if (!digits) return "";
  const num = Number(digits);
  if (!Number.isFinite(num)) return "";
  return num.toLocaleString("vi-VN");
};

export const formatVndDisplay = (value: string | number): string => {
  if (value === null || value === undefined) return "";
  const raw =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : value;
  const digits = String(raw).replace(/\D+/g, "");
  if (!digits) return "";
  const num = Number(digits);
  if (!Number.isFinite(num)) return "";
  return new Intl.NumberFormat("vi-VN").format(num);
};

export const parseRatioInput = (value: string): number | null => {
  if (value === undefined || value === null) return null;
  const digits = String(value).replace(/\D+/g, "");
  if (!digits) return null;
  const numeric = Number(digits);
  return Number.isFinite(numeric) ? numeric : null;
};

export const calculateProfitPercentBySale = (
  sellingPrice?: number | null,
  costPrice?: number | null
): number | null => {
  if (
    typeof sellingPrice !== "number" ||
    !Number.isFinite(sellingPrice) ||
    sellingPrice <= 0
  ) {
    return null;
  }
  if (
    typeof costPrice !== "number" ||
    !Number.isFinite(costPrice) ||
    costPrice < 0
  ) {
    return null;
  }

  return ((sellingPrice - costPrice) / sellingPrice) * 100;
};

export const formatProfitPercentBySale = (
  sellingPrice?: number | null,
  costPrice?: number | null,
  mode: "short" | "full" = "short"
): string | null => {
  const percent = calculateProfitPercentBySale(sellingPrice, costPrice);
  if (percent === null) return null;

  const rounded = Math.round(percent * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  const hasDecimal = Math.abs(abs - Math.trunc(abs)) > 0;
  const formatted = abs.toLocaleString("vi-VN", {
    minimumFractionDigits: hasDecimal ? 1 : 0,
    maximumFractionDigits: 1,
  });

  if (mode === "full") {
    return `${sign}${formatted}% lợi nhuận theo giá bán`;
  }

  return `${sign}${formatted}%`;
};

export const formatRateDescription = ({ multiplier, price, basePrice }: RateDescriptionInput): string => {
  void multiplier;
  return formatProfitPercentBySale(price, basePrice, "short") ?? "Chưa có % LN";
};

export const formatCurrencyValue = (value?: number | null): string => {
  const rounded = roundToNearestThousand(value);
  if (rounded === null || rounded <= 0) {
    return "-";
  }
  return currencyFormatter.format(rounded);
};

export const formatPromoPercent = (value?: number | null): string | null => {
  void value;
  return null;
};

export const formatDateLabel = (value?: string | null): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("vi-VN");
  }
  return value;
};

export const normalizeProductKey = (value?: string | null): string => (value || "").trim();

export const formatProfitValue = (value: number | null): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  const rounded = roundToNearestThousand(value) ?? 0;
  if (rounded === 0) return currencyFormatter.format(0);
  return currencyFormatter.format(rounded);
};

export const formatProfitRange = (importPrice?: number | null, wholesalePrice?: number | null, retailPrice?: number | null): string => {
  if (typeof importPrice !== "number" || !Number.isFinite(importPrice)) {
    return "-";
  }
  const wholesaleDiff = typeof wholesalePrice === "number" && Number.isFinite(wholesalePrice) ? wholesalePrice - importPrice : null;
  const retailDiff = typeof retailPrice === "number" && Number.isFinite(retailPrice) ? retailPrice - importPrice : null;

  const wholesaleText = formatProfitValue(wholesaleDiff);
  const retailText = formatProfitValue(retailDiff);

  return `${wholesaleText} - ${retailText}`;
};

export const toTimestamp = (value?: string | null): number => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

export const pickCheapestSupplier = (items: SupplyPriceItem[]): SupplyPriceItem | null => {
  if (!items.length) return null;
  return items.reduce<SupplyPriceItem | null>((best, current) => {
    if (!best) return current;
    const bestPrice = best.price ?? Number.POSITIVE_INFINITY;
    const currentPrice = current.price ?? Number.POSITIVE_INFINITY;
    if (currentPrice < bestPrice) return current;
    if (currentPrice > bestPrice) return best;
    const bestTs = toTimestamp(best.lastOrderDate);
    const currentTs = toTimestamp(current.lastOrderDate);
    if (currentTs > bestTs) return current;
    return best;
  }, null);
};

export const computeHighestSupplyPrice = (items: SupplyPriceItem[], fallback?: number | null): number | null => {
  const highest = items.reduce<number>((maxValue, current) => {
    const price = typeof current.price === "number" && Number.isFinite(current.price) ? current.price : Number.NEGATIVE_INFINITY;
    return price > maxValue ? price : maxValue;
  }, Number.NEGATIVE_INFINITY);

  if (Number.isFinite(highest) && highest > 0) {
    return highest;
  }

  if (typeof fallback === "number" && Number.isFinite(fallback) && fallback > 0) {
    return fallback;
  }

  return null;
};

export const toFinitePrice = (value: unknown): number | null => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};

export const mapProductPriceRow = (
  row: Record<string, unknown>,
  fallbackId: number
): ProductPricingRow => {
  const packageName = cleanupLabel(row?.[VARIANT_PRICING_COLS.packageName] ?? row?.package_label);
  const packageProduct = cleanupLabel(row?.[VARIANT_PRICING_COLS.variantName] ?? row?.package_product_label);
  const sanPhamRaw = (row?.[VARIANT_PRICING_COLS.code] ?? row?.id_product_label ?? row?.id_product ?? "").toString().trim();

  const wholesalePrice = toNumberOrNull(
    row?.[VARIANT_PRICING_COLS.pctCtv] ??
      row?.computed_wholesale_price ??
      row?.wholesale_price ??
      row?.gia_si ??
      row?.gia_ctv
  );
  const pctKhach = toNumberOrNull(
    row?.[VARIANT_PRICING_COLS.pctKhach] ??
      row?.computed_retail_price ??
      row?.retail_price ??
      row?.gia_le
  );
  const pctPromo = toNumberOrNull(
    row?.[VARIANT_PRICING_COLS.pctPromo] ??
      row?.computed_promo_price ??
      row?.promo_price ??
      row?.gia_khuyen_mai ??
      row?.gia_km
  );
  const pctStu = toNumberOrNull(
    row?.[VARIANT_PRICING_COLS.pctStu] ??
      row?.student_price
  );

  return {
    id: Number.isFinite(Number(row?.id)) ? Number(row?.id) : fallbackId,
    packageName: packageName || "Không xác định",
    packageProduct,
    sanPhamRaw,
    variantLabel: buildVariantLabel(packageProduct, sanPhamRaw),
    pctCtv: toNumberOrNull(row?.[VARIANT_PRICING_COLS.pctCtv]),
    pctKhach,
    pctPromo,
    pctStu,
    isActive: parseBoolean(row?.[VARIANT_PRICING_COLS.isActive]),
    basePrice: toNumberOrNull(
      row?.[VARIANT_PRICING_COLS.basePrice] ?? row?.base_price
    ),
    baseSupplyPrice: toNumberOrNull(row?.max_supply_price),
    wholesalePrice,
    retailPrice: pctKhach,
    studentPrice: pctStu,
    promoPrice: pctPromo,
    lastUpdated:
      typeof row?.[VARIANT_PRICING_COLS.updatedAt] === "string"
        ? row[VARIANT_PRICING_COLS.updatedAt]
        : typeof row?.updated_at === "string"
        ? row.updated_at
        : typeof row?.updatedAt === "string"
        ? row.updatedAt
        : typeof row?.update === "string"
        ? row.update
        : null,
  };
};
