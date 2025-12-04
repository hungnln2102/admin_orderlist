import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  XCircleIcon,
  UserPlusIcon,
  PlusCircleIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  PowerIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { deleteProductPrice } from "../lib/productPricesApi";
import { API_ENDPOINTS } from "../constants";
import StatCard, { STAT_CARD_ACCENTS } from "../components/StatCard";
import GradientButton from "../components/GradientButton";
import {
  PRODUCT_PRICE_COLS,
  SUPPLY_PRICE_COLS,
  SUPPLY_COLS,
} from "../lib/tableSql";

const API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_BASE_URL) ||
  (process.env.VITE_API_BASE_URL as string) ||
  "http://localhost:3001";

type StatusFilter = "all" | "active" | "inactive";

interface ProductPricingRow {
  id: number;
  packageName: string;
  packageProduct: string;
  sanPhamRaw: string;
  variantLabel: string;
  pctCtv: number | null;
  pctKhach: number | null;
  pctPromo: number | null;
  isActive: boolean;
  baseSupplyPrice: number | null;
  wholesalePrice: number | null;
  retailPrice: number | null;
  promoPrice: number | null;
  lastUpdated: string | null;
}

interface PricingStat {
  name: string;
  value: string;
  icon: typeof CurrencyDollarIcon;
  accent: keyof typeof STAT_CARD_ACCENTS;
  subtitle: string;
}

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const MIN_PROMO_RATIO = 0;

const roundToNearestThousand = (value?: number | null): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(Math.abs(value) / 1000) * 1000;
  return value < 0 ? -rounded : rounded;
};

const cleanupLabel = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  return String(value).replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
};

const formatSkuLabel = (value: string): string => {
  if (!value) return "-";
  return value
    .replace(/[_]+/g, " ")
    .replace(/--/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const extractMonthsLabel = (sanPham: string): string | null => {
  if (!sanPham) return null;
  const match = sanPham.match(/(\d+)\s*m\b/i);
  if (!match) return null;
  const months = Number.parseInt(match[1], 10);
  if (!Number.isFinite(months) || months <= 0) return null;
  return `${months} Tháng`;
};

const buildVariantLabel = (packageProduct: string, sanPham: string): string => {
  const monthsLabel = extractMonthsLabel(sanPham);
  if (packageProduct && monthsLabel) {
    return `${packageProduct} ${monthsLabel}`;
  }
  if (packageProduct) {
    return packageProduct;
  }
  return monthsLabel || formatSkuLabel(sanPham) || "Không Xác Định";
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return false;
  return ["true", "1", "t", "y", "yes"].includes(normalized);
};

const resolvePromoMultiplier = (
  pctKhach?: number | null,
  pctPromo?: number | null
): number | null => {
  if (
    typeof pctKhach !== "number" ||
    !Number.isFinite(pctKhach) ||
    pctKhach <= 0 ||
    typeof pctPromo !== "number" ||
    !Number.isFinite(pctPromo)
  ) {
    return null;
  }
  const promoMultiplier = pctKhach - pctPromo;
  if (!Number.isFinite(promoMultiplier) || promoMultiplier <= 0) {
    return null;
  }
  return promoMultiplier;
};

const hasValidPromoRatio = (
  value?: number | null,
  pctKhach?: number | null,
  pctCtv?: number | null
): boolean => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < MIN_PROMO_RATIO
  ) {
    return false;
  }
  if (
    typeof pctKhach !== "number" ||
    typeof pctCtv !== "number" ||
    !Number.isFinite(pctKhach) ||
    !Number.isFinite(pctCtv) ||
    pctKhach <= 0 ||
    pctCtv <= 0
  ) {
    return false;
  }
  const maxAllowed = pctKhach - 1;
  if (!Number.isFinite(maxAllowed) || maxAllowed < MIN_PROMO_RATIO) {
    return false;
  }
  if (value > maxAllowed) {
    return false;
  }
  return resolvePromoMultiplier(pctKhach, value) !== null;
};

interface RateDescriptionInput {
  multiplier?: number | null;
  price?: number | null;
  basePrice?: number | null;
  label?: string;
}

interface SupplyPriceItem {
  sourceId: number;
  sourceName: string;
  price: number | null;
  lastOrderDate: string | null;
}

interface SupplyPriceState {
  loading: boolean;
  error: string | null;
  items: SupplyPriceItem[];
  productName?: string;
}

interface ProductEditFormState {
  packageName: string;
  packageProduct: string;
  sanPham: string;
  pctCtv: string;
  pctKhach: string;
  pctPromo: string;
}

const sortSupplyItems = (items: SupplyPriceItem[]): SupplyPriceItem[] => {
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

const normalizeSupplyName = (value: string | null | undefined): string => {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

const dedupeSupplyItems = (items: SupplyPriceItem[]): SupplyPriceItem[] => {
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

    if (
      candidatePrice < existingPrice ||
      (candidatePrice === existingPrice && candidateDate > existingDate)
    ) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
};

const buildSupplyRowKey = (productId: number, sourceId: number): string =>
  `${productId}-${sourceId}`;

const applyBasePriceToProduct = (
  product: ProductPricingRow,
  basePrice: number | null
): ProductPricingRow => {
  if (
    typeof basePrice !== "number" ||
    !Number.isFinite(basePrice) ||
    basePrice <= 0
  ) {
    return product;
  }

  const wholesaleCandidate = multiplyBasePrice(product.pctCtv, basePrice);
  const resolvedWholesale =
    typeof wholesaleCandidate === "number" &&
    Number.isFinite(wholesaleCandidate) &&
    wholesaleCandidate > 0
      ? wholesaleCandidate
      : product.wholesalePrice;

  const retailCandidate = multiplyValue(
    resolvedWholesale ?? basePrice,
    product.pctKhach
  );

  const promoCandidate = calculatePromoPrice(
    product.pctKhach,
    product.pctPromo,
    product.pctCtv,
    resolvedWholesale ?? basePrice,
    basePrice
  );

  return {
    ...product,
    baseSupplyPrice: basePrice,
    wholesalePrice:
      typeof resolvedWholesale === "number" &&
      Number.isFinite(resolvedWholesale) &&
      resolvedWholesale > 0
        ? resolvedWholesale
        : product.wholesalePrice,
    retailPrice:
      typeof retailCandidate === "number" &&
      Number.isFinite(retailCandidate) &&
      retailCandidate > 0
        ? retailCandidate
        : product.retailPrice,
    promoPrice:
      typeof promoCandidate === "number" &&
      Number.isFinite(promoCandidate) &&
      promoCandidate > 0
        ? promoCandidate
        : product.promoPrice,
  };
};

interface BankOption {
  bin: string;
  name: string;
}

interface CreateProductFormState {
  packageName: string;
  packageProduct: string;
  sanPham: string;
  pctCtv: string;
  pctKhach: string;
  pctPromo: string;
}

interface CreateSupplierEntry {
  id: string;
  sourceName: string;
  price: string;
  numberBank: string;
  bankBin: string;
}

const createSupplierEntry = (): CreateSupplierEntry => {
  const globalCrypto =
    typeof globalThis !== "undefined" ? (globalThis as any).crypto : null;
  const id =
    globalCrypto && typeof globalCrypto.randomUUID === "function"
      ? globalCrypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return {
    id,
    sourceName: "",
    price: "",
    numberBank: "",
    bankBin: "",
  };
};

const formatRateDescription = ({
  multiplier,
  price,
  basePrice,
}: RateDescriptionInput): string => {
  // Hide percentage display while keeping layout spacing intact.
  return "";
};

const formatCurrencyValue = (value?: number | null): string => {
  const rounded = roundToNearestThousand(value);
  if (rounded === null || rounded <= 0) {
    return "-";
  }
  return currencyFormatter.format(rounded);
};

const formatPromoPercent = (value?: number | null): string | null => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  const percent = value * 100;
  const rounded =
    Math.abs(percent - Math.round(percent)) < 0.01
      ? Math.round(percent).toString()
      : percent.toFixed(2).replace(/\.?0+$/, "");
  return `${rounded}%`;
};

const formatDateLabel = (value?: string | null): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("vi-VN");
  }
  return value;
};

const normalizeProductKey = (value?: string | null): string =>
  (value || "").trim();

const formatProfitValue = (value: number | null): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  const rounded = roundToNearestThousand(value) ?? 0;
  if (rounded === 0) return currencyFormatter.format(0);
  return currencyFormatter.format(rounded);
};

const formatProfitRange = (
  importPrice?: number | null,
  wholesalePrice?: number | null,
  retailPrice?: number | null
): string => {
  if (typeof importPrice !== "number" || !Number.isFinite(importPrice)) {
    return "-";
  }
  const wholesaleDiff =
    typeof wholesalePrice === "number" && Number.isFinite(wholesalePrice)
      ? wholesalePrice - importPrice
      : null;
  const retailDiff =
    typeof retailPrice === "number" && Number.isFinite(retailPrice)
      ? retailPrice - importPrice
      : null;

  const wholesaleText = formatProfitValue(wholesaleDiff);
  const retailText = formatProfitValue(retailDiff);

  return `${wholesaleText} - ${retailText}`;
};

const toTimestamp = (value?: string | null): number => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

const pickCheapestSupplier = (
  items: SupplyPriceItem[]
): SupplyPriceItem | null => {
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

const computeHighestSupplyPrice = (
  items: SupplyPriceItem[],
  fallback?: number | null
): number | null => {
  const highest = items.reduce<number>((maxValue, current) => {
    const price =
      typeof current.price === "number" && Number.isFinite(current.price)
        ? current.price
        : Number.NEGATIVE_INFINITY;
    return price > maxValue ? price : maxValue;
  }, Number.NEGATIVE_INFINITY);

  if (Number.isFinite(highest) && highest > 0) {
    return highest;
  }

  if (
    typeof fallback === "number" &&
    Number.isFinite(fallback) &&
    fallback > 0
  ) {
    return fallback;
  }

  return null;
};

const multiplyValue = (
  value?: number | null,
  ratio?: number | null
): number | null => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    typeof ratio !== "number" ||
    !Number.isFinite(ratio) ||
    ratio <= 0
  ) {
    return null;
  }
  return value * ratio;
};

const multiplyBasePrice = (
  ratio?: number | null,
  basePrice?: number | null
): number | null => multiplyValue(basePrice, ratio);

const calculatePromoPrice = (
  pctKhach?: number | null,
  pctPromo?: number | null,
  pctCtv?: number | null,
  wholesalePrice?: number | null,
  fallbackBasePrice?: number | null
): number | null => {
  const baseValue =
    (typeof wholesalePrice === "number" &&
      Number.isFinite(wholesalePrice) &&
      wholesalePrice > 0 &&
      wholesalePrice) ||
    (typeof fallbackBasePrice === "number" &&
      Number.isFinite(fallbackBasePrice) &&
      fallbackBasePrice > 0 &&
      fallbackBasePrice) ||
    null;

  if (
    baseValue === null ||
    pctPromo === null ||
    pctPromo === undefined ||
    typeof pctPromo !== "number" ||
    !Number.isFinite(pctPromo)
  ) {
    return null;
  }

  if (!hasValidPromoRatio(pctPromo, pctKhach, pctCtv)) {
    return null;
  }

  const promoMultiplier = resolvePromoMultiplier(pctKhach, pctPromo);
  if (promoMultiplier === null) {
    return null;
  }

  return multiplyValue(baseValue, promoMultiplier);
};

const mapProductPriceRow = (
  row: any,
  fallbackId: number
): ProductPricingRow => {
  const packageName = cleanupLabel(
    row?.[PRODUCT_PRICE_COLS.package] ?? row?.package_label
  );
  const packageProduct = cleanupLabel(
    row?.[PRODUCT_PRICE_COLS.packageProduct] ?? row?.package_product_label
  );
  const sanPhamRaw = (
    row?.[PRODUCT_PRICE_COLS.product] ??
    row?.id_product_label ??
    row?.id_product ??
    ""
  )
    .toString()
    .trim();

  return {
    id: Number.isFinite(Number(row?.id)) ? Number(row?.id) : fallbackId,
    packageName: packageName || "Không xác định",
    packageProduct,
    sanPhamRaw,
    variantLabel: buildVariantLabel(packageProduct, sanPhamRaw),
    pctCtv: toNumberOrNull(row?.[PRODUCT_PRICE_COLS.pctCtv]),
    pctKhach: toNumberOrNull(row?.[PRODUCT_PRICE_COLS.pctKhach]),
    pctPromo: toNumberOrNull(row?.[PRODUCT_PRICE_COLS.pctPromo]),
    isActive: parseBoolean(row?.[PRODUCT_PRICE_COLS.isActive]),
    baseSupplyPrice: toNumberOrNull(row?.max_supply_price),
    wholesalePrice: toNumberOrNull(
      row?.computed_wholesale_price ??
        row?.wholesale_price ??
        row?.gia_si ??
        row?.gia_ctv
    ),
    retailPrice: toNumberOrNull(
      row?.computed_retail_price ?? row?.retail_price ?? row?.gia_le
    ),
    promoPrice: toNumberOrNull(
      row?.computed_promo_price ??
        row?.promo_price ??
        row?.gia_khuyen_mai ??
        row?.gia_km
    ),
    lastUpdated:
      typeof row?.[PRODUCT_PRICE_COLS.updateDate] === "string"
        ? row[PRODUCT_PRICE_COLS.updateDate]
        : typeof row?.updated_at === "string"
        ? row.updated_at
        : typeof row?.updatedAt === "string"
        ? row.updatedAt
        : null,
  };
};

function Pricing() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [productPrices, setProductPrices] = useState<ProductPricingRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(
    null
  );
  const [supplyPriceMap, setSupplyPriceMap] = useState<
    Record<string, SupplyPriceState>
  >({});
  const [editingSupplyRows, setEditingSupplyRows] = useState<
    Record<string, boolean>
  >({});
  const [supplyPriceDrafts, setSupplyPriceDrafts] = useState<
    Record<string, string>
  >({});
  const [savingSupplyRows, setSavingSupplyRows] = useState<
    Record<string, boolean>
  >({});
  const [supplyRowErrors, setSupplyRowErrors] = useState<
    Record<string, string | null>
  >({});
  const [newSupplyRows, setNewSupplyRows] = useState<
    Record<
      number,
      {
        sourceName: string;
        price: string;
        error: string | null;
        isSaving: boolean;
      }
    >
  >({});
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productEditForm, setProductEditForm] =
    useState<ProductEditFormState | null>(null);
  const [productEditError, setProductEditError] = useState<string | null>(null);
  const [isSavingProductEdit, setIsSavingProductEdit] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateProductFormState>({
    packageName: "",
    packageProduct: "",
    sanPham: "",
    pctCtv: "",
    pctKhach: "",
    pctPromo: "",
  });
  const [createSuppliers, setCreateSuppliers] = useState<CreateSupplierEntry[]>(
    [createSupplierEntry()]
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [statusOverrides, setStatusOverrides] = useState<
    Record<number, boolean>
  >({});
  const [updatedTimestampMap, setUpdatedTimestampMap] = useState<
    Record<number, string>
  >({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteProductState, setDeleteProductState] = useState<{
    product: ProductPricingRow | null;
    loading: boolean;
    error: string | null;
  }>({
    product: null,
    loading: false,
    error: null,
  });

  const fetchProductPrices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.PRODUCT_PRICES}`,
        { credentials: "include" }
      );
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok) {
        throw new Error("Không thể tải dữ liệu sản phẩm.");
      }
      const payload = await response.json();
      const rows: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
        ? payload.items
        : [];
      const normalizedRows = rows.map((row, index) =>
        mapProductPriceRow(row, index)
      );
      const initialUpdatedMap = normalizedRows.reduce<Record<number, string>>(
        (acc, row) => {
          if (row.lastUpdated) {
            acc[row.id] = row.lastUpdated;
          }
          return acc;
        },
        {}
      );
      setProductPrices(normalizedRows);
      setStatusOverrides({});
      setUpdatedTimestampMap(initialUpdatedMap);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
      setProductPrices([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải dữ liệu product_price."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSupplyPricesForProduct = useCallback(
    async (productName: string) => {
      const key = normalizeProductKey(productName);
      if (!key) return;
      setSupplyPriceMap((prev) => ({
        ...prev,
        [key]: {
          items: prev[key]?.items ?? [],
          loading: true,
          error: null,
          productName: prev[key]?.productName ?? productName,
        },
      }));

      try {
        const response = await fetch(
          `${API_BASE}${API_ENDPOINTS.SUPPLY_PRICES_BY_PRODUCT_NAME(
            productName
          )}`,
          { credentials: "include" }
        );
        if (!response.ok) {
          throw new Error("Không thể tải giá nhập");
        }
        const payload = await response.json();
        const mappedItems: SupplyPriceItem[] = Array.isArray(payload)
          ? payload.map((entry: any, index: number) => ({
              sourceId: Number.isFinite(
                Number(entry?.[SUPPLY_PRICE_COLS.sourceId])
              )
                ? Number(entry[SUPPLY_PRICE_COLS.sourceId])
                : index,
              sourceName:
                cleanupLabel(entry?.[SUPPLY_COLS.sourceName]) ||
                `Nh? Cung C?p #${
                  Number(entry?.[SUPPLY_PRICE_COLS.sourceId]) || index + 1
                }`,
              price: toNumberOrNull(entry?.[SUPPLY_PRICE_COLS.price]),
              lastOrderDate:
                typeof entry?.last_order_date === "string"
                  ? entry.last_order_date
                  : null,
            }))
          : [];
        const items = sortSupplyItems(dedupeSupplyItems(mappedItems));

        setSupplyPriceMap((prev) => ({
          ...prev,
          [key]: {
            loading: false,
            error: null,
            items,
            productName,
          },
        }));
      } catch (err) {
        setSupplyPriceMap((prev) => ({
          ...prev,
          [key]: {
            loading: false,
            items: prev[key]?.items ?? [],
            error:
              err instanceof Error
                ? err.message
                : "Không thể tải giá nhập của NCC",
            productName: prev[key]?.productName ?? productName,
          },
        }));
      }
    },
    []
  );

  const loadBankOptions = useCallback(async () => {
    if (isLoadingBanks || bankOptions.length > 0) return;
    setIsLoadingBanks(true);
    try {
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.BANK_LIST}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Không thể tải danh sách ngân hàng.");
      }
      const payload = await response.json();
      const items: BankOption[] = Array.isArray(payload)
        ? payload
            .map((row: any) => ({
              bin: row?.bin?.toString().trim() ?? "",
              name: row?.bank_name?.toString().trim() ?? row?.name ?? "",
            }))
            .filter((item) => item.bin && item.name)
        : [];
      setBankOptions(items);
    } catch (err) {
      console.error("Lỗi khi tải danh sách ngân hàng:", err);
    } finally {
      setIsLoadingBanks(false);
    }
  }, [bankOptions.length, isLoadingBanks]);

  useEffect(() => {
    fetchProductPrices();
  }, [fetchProductPrices]);

  useEffect(() => {
    if (isCreateModalOpen && bankOptions.length === 0 && !isLoadingBanks) {
      loadBankOptions();
    }
  }, [isCreateModalOpen, bankOptions.length, isLoadingBanks, loadBankOptions]);

  const handleRefreshAll = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetchProductPrices();
      const cachedNames = new Set<string>();
      Object.values(supplyPriceMap).forEach((entry) => {
        if (entry?.productName) {
          cachedNames.add(entry.productName);
        }
      });
      await Promise.all(
        Array.from(cachedNames).map((name) => fetchSupplyPricesForProduct(name))
      );
    } catch (error) {
      console.error("Failed to refresh pricing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    fetchProductPrices,
    fetchSupplyPricesForProduct,
    supplyPriceMap,
    isRefreshing,
  ]);

  const closeDeleteProductModal = useCallback(() => {
    setDeleteProductState({
      product: null,
      loading: false,
      error: null,
    });
  }, []);

  const handleRequestDeleteProduct = useCallback(
    (
      event: React.MouseEvent<HTMLButtonElement>,
      product: ProductPricingRow
    ) => {
      event.stopPropagation();
      setDeleteProductState({
        product,
        loading: false,
        error: null,
      });
    },
    []
  );

  const confirmDeleteProduct = useCallback(async () => {
    const product = deleteProductState.product;
    if (!product) return;
    setDeleteProductState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await deleteProductPrice(product.id);
      if (!response.success) {
        throw new Error(response.message || "Không thể xóa sản phẩm.");
      }
      setProductPrices((prev) => prev.filter((row) => row.id !== product.id));
      setSupplyPriceMap((prev) => {
        const next = { ...prev };
        const candidates = [
          product.sanPhamRaw,
          product.packageName,
          product.packageProduct,
        ];
        candidates.forEach((name) => {
          const key = normalizeProductKey(name || "");
          if (key && next[key]) {
            delete next[key];
          }
        });
        return next;
      });
      closeDeleteProductModal();
    } catch (error) {
      console.error("Failed to delete product price:", error);
      setDeleteProductState((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Không thể xóa sản phẩm. Vui lòng thử lại.",
      }));
    }
  }, [API_BASE, closeDeleteProductModal, deleteProductState.product]);

  const handleToggleProductDetails = (product: ProductPricingRow) => {
    const nextId = expandedProductId === product.id ? null : product.id;
    setExpandedProductId(nextId);
    if (nextId === product.id) {
      const key = normalizeProductKey(product.sanPhamRaw);
      const currentState = supplyPriceMap[key];
      if (
        !currentState ||
        (!currentState.loading && currentState.items.length === 0)
      ) {
        fetchSupplyPricesForProduct(product.sanPhamRaw);
      }
    }
  };

  const buildProductEditForm = (
    product: ProductPricingRow
  ): ProductEditFormState => ({
    packageName: product.packageName || "",
    packageProduct: product.packageProduct || "",
    sanPham: product.sanPhamRaw || "",
    pctCtv:
      product.pctCtv !== null && product.pctCtv !== undefined
        ? String(product.pctCtv)
        : "",
    pctKhach:
      product.pctKhach !== null && product.pctKhach !== undefined
        ? String(product.pctKhach)
        : "",
    pctPromo:
      product.pctPromo !== null && product.pctPromo !== undefined
        ? String(product.pctPromo)
        : "",
  });

  const handleStartProductEdit = (
    event: React.MouseEvent<HTMLButtonElement>,
    product: ProductPricingRow
  ) => {
    event.stopPropagation();
    setIsSavingProductEdit(false);
    if (editingProductId === product.id) {
      setEditingProductId(null);
      setProductEditForm(null);
      setProductEditError(null);
      return;
    }
    setProductEditError(null);
    setEditingProductId(product.id);
    setProductEditForm(buildProductEditForm(product));
  };

  const clearSupplyRowState = (rowKey: string) => {
    setEditingSupplyRows((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
    setSupplyPriceDrafts((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
    setSupplyRowErrors((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
  };

  const handleStartEditingSupply = (
    productId: number,
    sourceId: number,
    currentPrice: number | null
  ) => {
    const rowKey = buildSupplyRowKey(productId, sourceId);
    setEditingSupplyRows((prev) => ({ ...prev, [rowKey]: true }));
    setSupplyPriceDrafts((prev) => ({
      ...prev,
      [rowKey]:
        currentPrice === null || currentPrice === undefined
          ? ""
          : String(currentPrice),
    }));
    setSupplyRowErrors((prev) => ({ ...prev, [rowKey]: null }));
  };

  const handleSupplyInputChange = (
    productId: number,
    sourceId: number,
    nextValue: string
  ) => {
    const rowKey = buildSupplyRowKey(productId, sourceId);
    setSupplyPriceDrafts((prev) => ({ ...prev, [rowKey]: nextValue }));
    setSupplyRowErrors((prev) => ({ ...prev, [rowKey]: null }));
  };

  const handleCancelSupplyEditing = (productId: number, sourceId: number) => {
    const rowKey = buildSupplyRowKey(productId, sourceId);
    clearSupplyRowState(rowKey);
    setSavingSupplyRows((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
  };

  const handleConfirmSupplyEditing = async (
    productId: number,
    sourceId: number,
    productKey: string,
    productName: string
  ) => {
    const rowKey = buildSupplyRowKey(productId, sourceId);
    const rawValue = supplyPriceDrafts[rowKey];
    const trimmedValue = rawValue?.toString().trim() ?? "";
    if (!trimmedValue) {
      setSupplyRowErrors((prev) => ({
        ...prev,
        [rowKey]: "Vui lòng nhập giá hợp lệ",
      }));
      return;
    }
    const parsedValue = Number(trimmedValue);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      setSupplyRowErrors((prev) => ({
        ...prev,
        [rowKey]: "Giá nhập không được thấp hơn 0.",
      }));
      return;
    }

    setSavingSupplyRows((prev) => ({ ...prev, [rowKey]: true }));

    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.UPDATE_SUPPLY_PRICE(productId, sourceId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ price: parsedValue }),
          credentials: "include",
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể cập nhật giá nhập");
      }
      const normalizedPrice = Number.isFinite(Number(payload?.price))
        ? Number(payload?.price)
        : parsedValue;
      let nextHighestPrice: number | null = null;
      let shouldRecomputeBase = false;
      setSupplyPriceMap((prev) => {
        const currentState = prev[productKey];
        if (!currentState) return prev;
        const previousMax = computeHighestSupplyPrice(currentState.items, null);
        const currentSupplier = currentState.items.find(
          (supplier) => supplier.sourceId === sourceId
        );
        const previousPrice =
          typeof currentSupplier?.price === "number"
            ? currentSupplier.price
            : null;
        const wasHighestSupplier =
          typeof previousPrice === "number" &&
          typeof previousMax === "number" &&
          Math.abs(previousPrice - previousMax) < 0.00001;
        const nextItems = sortSupplyItems(
          currentState.items.map((supplier) =>
            supplier.sourceId === sourceId
              ? { ...supplier, price: normalizedPrice }
              : supplier
          )
        );
        const updatedMax = computeHighestSupplyPrice(nextItems, null);
        const priceChanged =
          previousPrice === null || previousPrice !== normalizedPrice;
        const validUpdatedMax =
          typeof updatedMax === "number" &&
          Number.isFinite(updatedMax) &&
          updatedMax > 0;
        if (validUpdatedMax) {
          nextHighestPrice = updatedMax;
          if (
            updatedMax !== previousMax ||
            (wasHighestSupplier && priceChanged)
          ) {
            shouldRecomputeBase = true;
          }
        } else if (wasHighestSupplier && priceChanged) {
          nextHighestPrice = updatedMax ?? null;
          shouldRecomputeBase = true;
        }
        return {
          ...prev,
          [productKey]: {
            ...currentState,
            items: nextItems,
          },
        };
      });
      if (shouldRecomputeBase) {
        setProductPrices((prev) =>
          prev.map((product) =>
            product.id === productId
              ? applyBasePriceToProduct(product, nextHighestPrice)
              : product
          )
        );
      }
      clearSupplyRowState(rowKey);
      await fetchSupplyPricesForProduct(productName);
      if (shouldRecomputeBase) {
        try {
          await fetchProductPrices();
        } catch (error) {
          console.error("Failed to refresh product pricing:", error);
        }
      }
    } catch (err) {
      setSupplyRowErrors((prev) => ({
        ...prev,
        [rowKey]:
          err instanceof Error ? err.message : "Không thể cập nhật giá nhập.",
      }));
    } finally {
      setSavingSupplyRows((prev) => {
        const next = { ...prev };
        delete next[rowKey];
        return next;
      });
    }
  };

  const handleStartAddSupplierRow = (productId: number) => {
    setNewSupplyRows((prev) => {
      if (prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          sourceName: "",
          price: "",
          error: null,
          isSaving: false,
        },
      };
    });
  };

  const handleNewSupplierInputChange = (
    productId: number,
    field: "sourceName" | "price",
    value: string
  ) => {
    setNewSupplyRows((prev) => {
      const current = prev[productId];
      if (!current) return prev;
      return {
        ...prev,
        [productId]: { ...current, [field]: value, error: null },
      };
    });
  };

  const handleCancelAddSupplierRow = (productId: number) => {
    setNewSupplyRows((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const handleConfirmAddSupplierRow = async (product: ProductPricingRow) => {
    const current = newSupplyRows[product.id];
    if (!current) return;
    const trimmedName = current.sourceName.trim();
    const parsedPrice = Number(current.price);
    if (!trimmedName) {
      setNewSupplyRows((prev) => ({
        ...prev,
        [product.id]: {
          ...current,
          error: "Vui lòng nhập tên nguồn hợp lệ.",
        },
      }));
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setNewSupplyRows((prev) => ({
        ...prev,
        [product.id]: {
          ...current,
          error: "Giá nhập phải lớn hơn 0.",
        },
      }));
      return;
    }

    setNewSupplyRows((prev) => ({
      ...prev,
      [product.id]: { ...current, isSaving: true, error: null },
    }));

    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.CREATE_SUPPLY_PRICE(product.id)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceName: trimmedName,
            price: parsedPrice,
          }),
          credentials: "include",
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể thêm nguồn mới.");
      }
      const productKey = normalizeProductKey(product.sanPhamRaw);
      const resolvedSourceId = Number(payload?.sourceId);
      const normalizedPrice = Number.isFinite(Number(payload?.price))
        ? Number(payload?.price)
        : parsedPrice;
      let nextHighestPrice: number | null = null;
      let shouldRecomputeBase = false;
      setSupplyPriceMap((prev) => {
        const currentState = prev[productKey];
        const currentItems = currentState?.items ?? [];
        const hasExistingRow = currentItems.some(
          (supplier) =>
            typeof supplier.sourceId === "number" &&
            supplier.sourceId === resolvedSourceId
        );
        const nextItems = sortSupplyItems(
          hasExistingRow
            ? currentItems.map((supplier) =>
                supplier.sourceId === resolvedSourceId
                  ? { ...supplier, price: normalizedPrice }
                  : supplier
              )
            : [
                ...currentItems,
                {
                  sourceId:
                    Number.isFinite(resolvedSourceId) && resolvedSourceId > 0
                      ? resolvedSourceId
                      : Date.now(),
                  sourceName: trimmedName,
                  price: normalizedPrice,
                  lastOrderDate: null,
                },
              ]
        );
        const previousMax = computeHighestSupplyPrice(currentItems, null);
        const updatedMax = computeHighestSupplyPrice(nextItems, null);
        const differenceDetected =
          typeof previousMax === "number" && typeof updatedMax === "number"
            ? Math.abs(updatedMax - previousMax) > 0.00001
            : previousMax !== updatedMax;

        if (differenceDetected) {
          shouldRecomputeBase = true;
        }
        nextHighestPrice = updatedMax;

        return {
          ...prev,
          [productKey]: {
            loading: currentState?.loading ?? false,
            error: null,
            items: nextItems,
          },
        };
      });
      if (shouldRecomputeBase) {
        setProductPrices((prev) =>
          prev.map((row) =>
            row.id === product.id
              ? applyBasePriceToProduct(row, nextHighestPrice)
              : row
          )
        );
      }
      await fetchSupplyPricesForProduct(product.sanPhamRaw);
      handleCancelAddSupplierRow(product.id);
      if (shouldRecomputeBase) {
        try {
          await fetchProductPrices();
        } catch (error) {
          console.error("Failed to refresh product pricing:", error);
        }
      }
    } catch (err) {
      setNewSupplyRows((prev) => ({
        ...prev,
        [product.id]: {
          ...current,
          isSaving: false,
          error:
            err instanceof Error ? err.message : "Không thể thêm nguồn mới.",
        },
      }));
    }
  };

  const handleDeleteSupplyRow = async (
    productId: number,
    sourceId: number,
    productKey: string,
    productName: string
  ) => {
    const rowKey = buildSupplyRowKey(productId, sourceId);
    setSupplyRowErrors((prev) => ({ ...prev, [rowKey]: null }));
    setSavingSupplyRows((prev) => ({ ...prev, [rowKey]: true }));
    let nextHighestPrice: number | null = null;
    let shouldRecomputeBase = false;

    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.DELETE_SUPPLY_PRICE(productId, sourceId)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể xóa nguồn này.");
      }

      setSupplyPriceMap((prev) => {
        const currentState = prev[productKey];
        if (!currentState) return prev;
        const nextItems = sortSupplyItems(
          currentState.items.filter(
            (supplier) => supplier.sourceId !== sourceId
          )
        );
        const previousMax = computeHighestSupplyPrice(currentState.items, null);
        const updatedMax = computeHighestSupplyPrice(nextItems, null);
        const differenceDetected =
          typeof previousMax === "number" && typeof updatedMax === "number"
            ? Math.abs(updatedMax - previousMax) > 0.00001
            : previousMax !== updatedMax;

        if (differenceDetected) {
          shouldRecomputeBase = true;
        }
        nextHighestPrice = updatedMax;

        return {
          ...prev,
          [productKey]: {
            ...currentState,
            items: nextItems,
          },
        };
      });

      clearSupplyRowState(rowKey);

      if (shouldRecomputeBase) {
        setProductPrices((prev) =>
          prev.map((product) =>
            product.id === productId
              ? applyBasePriceToProduct(product, nextHighestPrice)
              : product
          )
        );
      }

      await fetchSupplyPricesForProduct(productName);
      if (shouldRecomputeBase) {
        try {
          await fetchProductPrices();
        } catch (error) {
          console.error("Failed to refresh product pricing:", error);
        }
      }
    } catch (err) {
      setSupplyRowErrors((prev) => ({
        ...prev,
        [rowKey]:
          err instanceof Error ? err.message : "Không thể xóa nguồn này.",
      }));
    } finally {
      setSavingSupplyRows((prev) => {
        const next = { ...prev };
        delete next[rowKey];
        return next;
      });
    }
  };

  const handleProductEditChange = (
    field: keyof ProductEditFormState,
    value: string
  ) => {
    setProductEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const resetCreateState = () => {
    setCreateForm({
      packageName: "",
      packageProduct: "",
      sanPham: "",
      pctCtv: "",
      pctKhach: "",
      pctPromo: "",
    });
    setCreateSuppliers([createSupplierEntry()]);
    setCreateError(null);
    setIsSubmittingCreate(false);
  };

  const handleCancelProductEdit = () => {
    setEditingProductId(null);
    setProductEditForm(null);
    setProductEditError(null);
    setIsSavingProductEdit(false);
  };

  const parseRatioInput = (value: string): number | null => {
    if (value === undefined || value === null) return null;
    const normalized = value.toString().replace(",", ".").trim();
    if (!normalized) return null;
    return toNumberOrNull(normalized);
  };

  const handleOpenCreateModal = () => {
    resetCreateState();
    setIsCreateModalOpen(true);
    if (bankOptions.length === 0 && !isLoadingBanks) {
      loadBankOptions();
    }
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    resetCreateState();
  };

  const handleCreateFormChange = (
    field: keyof CreateProductFormState,
    value: string
  ) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSupplierChange = (
    supplierId: string,
    field: keyof Omit<CreateSupplierEntry, "id">,
    value: string
  ) => {
    setCreateSuppliers((prev) =>
      prev.map((entry) =>
        entry.id === supplierId ? { ...entry, [field]: value } : entry
      )
    );
  };

  const handleAddSupplierRow = () => {
    setCreateSuppliers((prev) => [...prev, createSupplierEntry()]);
  };

  const handleRemoveSupplierRow = (supplierId: string) => {
    setCreateSuppliers((prev) =>
      prev.length === 1 ? prev : prev.filter((entry) => entry.id !== supplierId)
    );
  };

  const handleSubmitProductEdit = async () => {
    if (!productEditForm || editingProductId === null) return;
    const normalizedPackageName = productEditForm.packageName?.trim() ?? "";
    const normalizedPackageProduct =
      productEditForm.packageProduct?.trim() ?? "";
    const normalizedSanPham = productEditForm.sanPham?.trim() ?? "";

    if (!normalizedSanPham) {
      setProductEditError("Vui lòng nhập mã sản phẩm hợp lệ");
      return;
    }

    const nextPctCtv = parseRatioInput(productEditForm.pctCtv);
    const nextPctKhach = parseRatioInput(productEditForm.pctKhach);
    const nextPctPromo = parseRatioInput(productEditForm.pctPromo);

    if (!nextPctCtv || nextPctCtv <= 0) {
      setProductEditError("Tỷ giá CTV phải lớn hơn 0");
      return;
    }
    if (!nextPctKhach || nextPctKhach <= 0) {
      setProductEditError("Tỷ giá Khách phải lớn hơn 0");
      return;
    }
    if (nextPctPromo !== null) {
      if (nextPctPromo < MIN_PROMO_RATIO) {
        setProductEditError("T? gi? khuy?n m?i kh?ng ???c ?m.");
        return;
      }
      const promoHeadroom = Math.max(0, nextPctKhach - 1);
      if (promoHeadroom === 0 && nextPctPromo > 0) {
        setProductEditError(
          "T? gi? khuy?n m?i kh?ng ?p d?ng khi T? gi? Kh?ch ? 1."
        );
        return;
      }
      if (nextPctPromo > promoHeadroom) {
        setProductEditError(
          `T? gi? khuy?n m?i kh?ng ???c v??t ${promoHeadroom.toFixed(2)}`
        );
        return;
      }
    }
    setIsSavingProductEdit(true);
    setProductEditError(null);

    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.PRODUCT_PRICE_DETAIL(editingProductId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            packageName: normalizedPackageName,
            packageProduct: normalizedPackageProduct,
            sanPham: normalizedSanPham,
            pctCtv: nextPctCtv,
            pctKhach: nextPctKhach,
            pctPromo: nextPctPromo,
          }),
          credentials: "include",
        }
      );
      const rawBody = await response.text();
      let payload: any = null;
      if (rawBody) {
        try {
          payload = JSON.parse(rawBody);
        } catch {
          payload = null;
        }
      }
      if (!response.ok) {
        const errorMessage =
          payload?.error ||
          rawBody?.trim() ||
          "Không thể cập nhật giá sản phẩm";
        throw new Error(errorMessage);
      }

      const updatedRow = mapProductPriceRow(payload, editingProductId);
      setProductPrices((prev) =>
        prev.map((row) => (row.id === editingProductId ? updatedRow : row))
      );
      if (updatedRow?.id !== undefined) {
        setUpdatedTimestampMap((prev) => ({
          ...prev,
          [updatedRow.id]: updatedRow.lastUpdated || new Date().toISOString(),
        }));
      }

      await fetchProductPrices();
      setEditingProductId(null);
      setProductEditForm(null);
    } catch (err) {
      console.error("Lỗi khi cập nhật giá sản phẩm:", err);
      setProductEditError(
        err instanceof Error ? err.message : "Không thể cập nhật giá sản phẩm"
      );
    } finally {
      setIsSavingProductEdit(false);
    }
  };

  const handleSubmitCreateProduct = async () => {
    const trimmedPackage = createForm.packageName.trim();
    const trimmedProduct = createForm.packageProduct.trim();
    const trimmedSanPham = createForm.sanPham.trim();
    const pctCtvValue = parseRatioInput(createForm.pctCtv);
    const pctKhachValue = parseRatioInput(createForm.pctKhach);
    const pctPromoValue = parseRatioInput(createForm.pctPromo);

    if (!trimmedSanPham) {
      setCreateError("Vui lòng nhập mã sản phẩm");
      return;
    }
    if (!pctCtvValue || pctCtvValue <= 0) {
      setCreateError("Tỷ giá CTV phải lớn hơn 0.");
      return;
    }
    if (!pctKhachValue || pctKhachValue <= 0) {
      setCreateError("Tỷ giá khách phải lớn hơn 0.");
      return;
    }
    if (pctPromoValue !== null) {
      if (pctPromoValue < MIN_PROMO_RATIO) {
        setCreateError("T? gi? khuy?n m?i kh?ng ???c ?m.");
        return;
      }
      const promoHeadroom = Math.max(0, pctKhachValue - 1);
      if (promoHeadroom === 0 && pctPromoValue > 0) {
        setCreateError(
          "T? gi? khuy?n m?i kh?ng ?p d?ng khi T? gi? Kh?ch ? 1."
        );
        return;
      }
      if (pctPromoValue > promoHeadroom) {
        setCreateError(
          `T? gi? khuy?n m?i kh?ng ???c v??t ${promoHeadroom.toFixed(2)}`
        );
        return;
      }
    }
    setIsSubmittingCreate(true);
    setCreateError(null);

    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.PRODUCT_PRICES}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            packageName: trimmedPackage,
            packageProduct: trimmedProduct,
            sanPham: trimmedSanPham,
            pctCtv: pctCtvValue,
            pctKhach: pctKhachValue,
            pctPromo: pctPromoValue,
            suppliers: normalizedSuppliers,
          }),
          credentials: "include",
        }
      );
      const rawBody = await response.text();
      let payload: any = null;
      if (rawBody) {
        try {
          payload = JSON.parse(rawBody);
        } catch {
          payload = null;
        }
      }
      if (!response.ok) {
        const errorMessage =
          payload?.error || rawBody?.trim() || "Không thể tạo sản phẩm";
        throw new Error(errorMessage);
      }
      await fetchProductPrices();
      handleCloseCreateModal();
    } catch (err) {
      console.error("Lỗi khi tạo sản phẩm:", err);
      setCreateError(
        err instanceof Error ? err.message : "Không thể tạo sản phẩm"
      );
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleToggleStatus = async (item: ProductPricingRow) => {
    const current = statusOverrides[item.id] ?? item.isActive ?? false;
    const nextStatus = !current;
    const previousOverride = statusOverrides[item.id];
    const previousUpdated = updatedTimestampMap[item.id];
    const optimisticTimestamp = new Date().toISOString();

    setStatusOverrides((prev) => ({
      ...prev,
      [item.id]: nextStatus,
    }));

    setProductPrices((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, isActive: nextStatus } : row
      )
    );

    setUpdatedTimestampMap((prev) => ({
      ...prev,
      [item.id]: optimisticTimestamp,
    }));

    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.PRODUCT_PRICES}/${item.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: nextStatus,
          }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Lỗi khi cập nhật trạng thái");
      }

      const payload: {
        id: number;
        is_active: boolean;
        update?: string;
      } = await response.json();

      const serverStatus = payload?.is_active ?? nextStatus;
      const serverUpdated =
        typeof payload?.update === "string"
          ? payload.update
          : optimisticTimestamp;

      setStatusOverrides((prev) => ({
        ...prev,
        [item.id]: serverStatus,
      }));

      setProductPrices((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? { ...row, isActive: serverStatus, lastUpdated: serverUpdated }
            : row
        )
      );

      setUpdatedTimestampMap((prev) => ({
        ...prev,
        [item.id]: serverUpdated,
      }));
    } catch (error) {
      console.error("Failed to toggle product status:", error);

      setStatusOverrides((prev) => {
        const next = { ...prev };
        if (previousOverride === undefined) {
          delete next[item.id];
        } else {
          next[item.id] = previousOverride;
        }
        return next;
      });

      setProductPrices((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? {
                ...row,
                isActive: previousOverride ?? item.isActive ?? false,
              }
            : row
        )
      );

      setUpdatedTimestampMap((prev) => {
        const next = { ...prev };
        if (previousUpdated) {
          next[item.id] = previousUpdated;
        } else {
          delete next[item.id];
        }
        return next;
      });
      alert("Cập nhật thất bại. Vui lòng thử lại");
    }
  };

  const filteredPricing = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return productPrices
      .filter((item) => {
        if (statusFilter === "active" && !item.isActive) return false;
        if (statusFilter === "inactive" && item.isActive) return false;
        if (!normalizedSearch) return true;

        const haystack = [
          item.packageName,
          item.packageProduct,
          item.sanPhamRaw,
          item.variantLabel,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => {
        const aInactive = !(statusOverrides[a.id] ?? a.isActive);
        const bInactive = !(statusOverrides[b.id] ?? b.isActive);
        if (aInactive !== bInactive) {
          return aInactive ? 1 : -1;
        }
        const aTimestamp = toTimestamp(
          updatedTimestampMap[a.id] ?? a.lastUpdated
        );
        const bTimestamp = toTimestamp(
          updatedTimestampMap[b.id] ?? b.lastUpdated
        );
        if (aTimestamp !== bTimestamp) {
          return bTimestamp - aTimestamp;
        }
        return a.id - b.id;
      });
  }, [
    productPrices,
    searchTerm,
    statusFilter,
    statusOverrides,
    updatedTimestampMap,
  ]);

  const pricingStats = useMemo<PricingStat[]>(() => {
    const total = productPrices.length;
    const activeCount = productPrices.filter((item) => item.isActive).length;
    const inactiveCount = total - activeCount;

    return [
      {
        name: "Tổng Sản Phẩm",
        value: total.toString(),
        icon: CurrencyDollarIcon,
        accent: "emerald",
      },
      {
        name: "Đang Hoạt Động",
        value: activeCount.toString(),
        icon: ArrowTrendingUpIcon,
        accent: "sky",
      },
      {
        name: "Tạm Dừng",
        value: inactiveCount.toString(),
        icon: PencilIcon,
        accent: "violet",
      },
    ];
  }, [productPrices]);

  return (
    <>
      {deleteProductState.product && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={() => {
            if (!deleteProductState.loading) {
              closeDeleteProductModal();
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-lg font-semibold text-white">xác định Xóa</p>
                <p className="text-xs text-white/70">
                  Hành động này sẽ Xóa Sản Phẩm khỏi bảng Giá.
                </p>
              </div>
              <button
                type="button"
                className="text-white/60 hover:text-white/70 disabled:opacity-50"
                onClick={closeDeleteProductModal}
                disabled={deleteProductState.loading}
              >
                &#10005;
              </button>
            </div>
            <div className="space-y-3 text-sm text-white/70">
              <div>
                <p className="font-semibold text-white">
                  {deleteProductState.product.packageName ||
                    deleteProductState.product.packageProduct ||
                    deleteProductState.product.sanPhamRaw ||
                    `Sản Phẩm #${deleteProductState.product.id}`}
                </p>
                <p className="text-xs text-white/70">
                  Mã:{" "}
                  {deleteProductState.product.sanPhamRaw || "Không xác định"}
                </p>
              </div>
              <p>
                Bạn có chắc chắn muốn xóa sản phẩm này? Hành động không thể hoàn
                tác và dữ liệu liên quan sẽ được cập nhật.
              </p>
            </div>
            {deleteProductState.error && (
              <p className="mt-4 text-xs text-red-500">
                {deleteProductState.error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white/70 rounded-lg border border-gray-200 hover:bg-indigo-500/10 disabled:opacity-50"
                onClick={closeDeleteProductModal}
                disabled={deleteProductState.loading}
              >
                Hủy
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-60"
                onClick={confirmDeleteProduct}
                disabled={deleteProductState.loading}
              >
                {deleteProductState.loading ? "Đang Xóa..." : "Xóa Sản Phẩm"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-2 py-4 sm:px-4 sm:py-6">
          <div className="relative flex w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl max-h-[95vh]">
            <button
              className="absolute right-4 top-4 text-white/60 hover:text-white/70"
              onClick={handleCloseCreateModal}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Thêm Sản Phẩm mới
                </h2>
                <p className="text-sm text-white/70">
                  Nhập Thông tin Sản Phẩm, Nhà Cung Cấp, Tỷ Giá
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-sky-100/40 p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                    Thông Tin Sản Phẩm
                  </p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                        Sản Phẩm
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/40"
                        value={createForm.packageName}
                        onChange={(event) =>
                          handleCreateFormChange(
                            "packageName",
                            event.target.value
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                        Gói Sản Phẩm
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/40"
                        value={createForm.packageProduct}
                        onChange={(event) =>
                          handleCreateFormChange(
                            "packageProduct",
                            event.target.value
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                        Mã Sản Phẩm
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/40"
                        value={createForm.sanPham}
                        onChange={(event) =>
                          handleCreateFormChange("sanPham", event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-white via-purple-50 to-purple-100/40 p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                    Tỷ Giá
                  </p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                        Tỷ Giá CTV
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-purple-300/50 focus:ring-2 focus:ring-purple-200/40 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={createForm.pctCtv}
                        onChange={(event) =>
                          handleCreateFormChange("pctCtv", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                        Tỷ Giá Khách
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-purple-300/50 focus:ring-2 focus:ring-purple-200/40 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={createForm.pctKhach}
                        onChange={(event) =>
                          handleCreateFormChange("pctKhach", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                        Tỷ Giá Khuyến Mãi
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-purple-300/50 focus:ring-2 focus:ring-purple-200/40 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={createForm.pctPromo}
                        onChange={(event) =>
                          handleCreateFormChange("pctPromo", event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-gray-50 to-gray-100/40 p-5 shadow-sm">
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                    Thông Tin Nhà Cung Cấp
                  </p>
                  <div className="space-y-4">
                    {createSuppliers.map((supplier, index) => (
                      <div
                        key={supplier.id}
                        className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-inner"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-white">
                            Nhà Cung Cấp #{index + 1}
                          </p>
                          {createSuppliers.length > 1 && (
                            <button
                              type="button"
                              className="text-xs text-red-500 hover:text-red-600"
                              onClick={() =>
                                handleRemoveSupplierRow(supplier.id)
                              }
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                              Tên NCC
                            </label>
                            <input
                              type="text"
                              className="mt-1 w-full rounded-xl border border-gray-200 bg-white/90 px-3 py-2 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                              value={supplier.sourceName}
                              onChange={(event) =>
                                handleSupplierChange(
                                  supplier.id,
                                  "sourceName",
                                  event.target.value
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                              Giá Nhập
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              className="mt-1 w-full rounded-xl border border-gray-200 bg-white/90 px-3 py-2 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                              value={supplier.price}
                              onChange={(event) =>
                                handleSupplierChange(
                                  supplier.id,
                                  "price",
                                  event.target.value
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                              Số Tài Khoản
                            </label>
                            <input
                              type="text"
                              className="mt-1 w-full rounded-xl border border-gray-200 bg-white/90 px-3 py-2 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                              value={supplier.numberBank}
                              onChange={(event) =>
                                handleSupplierChange(
                                  supplier.id,
                                  "numberBank",
                                  event.target.value
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                              Ngân Hàng
                            </label>
                            <select
                              className="mt-1 w-full rounded-xl border border-gray-200 bg-white/90 px-3 py-2 text-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                              value={supplier.bankBin}
                              onChange={(event) =>
                                handleSupplierChange(
                                  supplier.id,
                                  "bankBin",
                                  event.target.value
                                )
                              }
                            >
                              <option value="">Chọn Ngân Hàng</option>
                              {bankOptions.map((bank) => (
                                <option key={bank.bin} value={bank.bin}>
                                  {bank.name}
                                </option>
                              ))}
                            </select>
                            {isLoadingBanks && (
                              <p className="mt-1 text-[11px] text-white/60">
                                Đang Tải Danh Sách Ngân Hàng...
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className="inline-flex items-center rounded-full border border-dashed border-blue-300 px-4 py-2 text-sm font-semibold text-blue-600 hover:border-blue-400 hover:text-blue-700"
                      onClick={handleAddSupplierRow}
                    >
                      <UserPlusIcon className="mr-2 h-4 w-4" />
                      Thêm NCC
                    </button>
                  </div>
                </div>
              </div>

              {createError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                  {createError}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="inline-flex items-center rounded-xl border border-white/25 bg-white/10 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-white/60 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleCloseCreateModal}
                  disabled={isSubmittingCreate}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  className="inline-flex items-center rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-200/50 hover:opacity-90 disabled:opacity-60"
                  onClick={handleSubmitCreateProduct}
                  disabled={isSubmittingCreate}
                >
                  {isSubmittingCreate ? "Đang Lưu..." : "Luu Sản Phẩm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Bảng Giá Sản Phẩm</h1>
          </div>
          <div className="mt-4 sm:mt-0">
            <GradientButton icon={PlusIcon} onClick={handleOpenCreateModal}>
              Thêm Sản Phẩm
            </GradientButton>
          </div>
        </div>

        <div className="rounded-[28px] bg-gradient-to-br from-white/6 via-indigo-400/25 to-indigo-900/40 border border-white/10 p-5 shadow-[0_24px_65px_-28px_rgba(0,0,0,0.8),0_18px_42px_-26px_rgba(255,255,255,0.25)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pricingStats.map((stat) => (
              <StatCard
                key={stat.name}
                title={stat.name}
                value={stat.value}
                icon={stat.icon}
                subtitle={stat.subtitle}
                accent={STAT_CARD_ACCENTS[stat.accent]}
              />
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-950/70 via-slate-900/60 to-indigo-950/70 border border-white/10 rounded-2xl shadow-lg p-6 text-white backdrop-blur">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
              <input
                type="text"
                placeholder="Tìm Kiếm Sản Phẩm..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-white/60 focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400/60"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400/60"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">Trạng Thái</option>
              <option value="active">Đang Hoạt Động</option>
              <option value="inactive">Tạm Dừng</option>
            </select>

            <GradientButton
              className="w-full justify-center"
              type="button"
              onClick={handleRefreshAll}
              disabled={isLoading || isRefreshing}
            >
              {isLoading || isRefreshing ? "Đang Đồng Bộ..." : "Đồng Bộ Lỗi"}
            </GradientButton>
          </div>
          {error && (
            <div className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="bg-white/10 border border-white/10 rounded-2xl shadow-lg overflow-hidden backdrop-blur">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-white">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                    Sản Phẩm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                    Giá Sỉ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                    Giá Lẻ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                    Giá Khuyến Mãi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                    Tình Trạng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                    Cập Nhật
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase">
                    Thao Tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/5 divide-y divide-white/10">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-sm text-white/80"
                    >
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : filteredPricing.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-sm text-white/80"
                    >
                      {error
                        ? "Không thể tải dữ liệu. Vui lòng thử lại."
                        : "Không có sản phẩm."}
                    </td>
                  </tr>
                ) : (
                  filteredPricing.map((item) => {
                    const isExpanded = expandedProductId === item.id;
                    const productKey = normalizeProductKey(item.sanPhamRaw);
                    const supplyState = supplyPriceMap[productKey];
                    const supplierItems = supplyState?.items ?? [];
                    const pendingNewSupply = newSupplyRows[item.id] || null;
                    const composedSupplierRows = [
                      ...supplierItems.map((supplier) => ({
                        kind: "existing",
                        supplier,
                      })),
                      ...(pendingNewSupply ? [{ kind: "new" }] : []),
                    ];
                    const cheapestSupplier =
                      pickCheapestSupplier(supplierItems);
                    const cheapestPrice =
                      cheapestSupplier?.price ?? item.baseSupplyPrice;
                    const cheapestSupplierName =
                      cheapestSupplier?.sourceName ?? "-";
                    const highestSupplyPrice = computeHighestSupplyPrice(
                      supplierItems,
                      item.baseSupplyPrice
                    );
                    const handleReloadSupply = () => {
                      fetchSupplyPricesForProduct(item.sanPhamRaw);
                    };
                    const resolvedIsActive =
                      statusOverrides[item.id] ?? item.isActive ?? false;
                    const displayUpdated =
                      updatedTimestampMap[item.id] ?? item.lastUpdated ?? "";
                    const handleToggleClick = (
                      event: React.MouseEvent<HTMLButtonElement>
                    ) => {
                      event.stopPropagation();
                      handleToggleStatus(item);
                    };
                    const formattedUpdated = displayUpdated
                      ? formatDateLabel(displayUpdated)
                      : "-";
                    const isEditingProduct = editingProductId === item.id;
                    const currentEditForm = isEditingProduct
                      ? productEditForm
                      : null;
                    const previewRatios = currentEditForm
                      ? {
                          pctCtv: parseRatioInput(currentEditForm.pctCtv),
                          pctKhach: parseRatioInput(currentEditForm.pctKhach),
                          pctPromo: parseRatioInput(currentEditForm.pctPromo),
                        }
                      : null;
                    const previewWholesalePrice = previewRatios
                      ? multiplyBasePrice(
                          previewRatios.pctCtv,
                          highestSupplyPrice
                        )
                      : null;
                    const resolvedWholesaleBase =
                      typeof previewWholesalePrice === "number" &&
                      Number.isFinite(previewWholesalePrice) &&
                      previewWholesalePrice > 0
                        ? previewWholesalePrice
                        : highestSupplyPrice;
                    const previewRetailPrice = previewRatios
                      ? multiplyValue(
                          resolvedWholesaleBase,
                          previewRatios.pctKhach
                        )
                      : null;
                    const previewPromoPrice = previewRatios
                      ? calculatePromoPrice(
                          previewRatios.pctKhach,
                          previewRatios.pctPromo,
                          previewRatios.pctCtv,
                          previewWholesalePrice,
                          highestSupplyPrice
                        )
                      : null;
                    const previewPromoPercentLabel = formatPromoPercent(
                      previewRatios?.pctPromo ?? null
                    );
                    const showPreviewPromo =
                      hasValidPromoRatio(
                        previewRatios?.pctPromo ?? null,
                        previewRatios?.pctKhach ?? null,
                        previewRatios?.pctCtv ?? null
                      ) && Number.isFinite(previewPromoPrice ?? NaN);
                    const highestSupplyPriceDisplay =
                      typeof highestSupplyPrice === "number" &&
                      Number.isFinite(highestSupplyPrice) &&
                      highestSupplyPrice > 0
                        ? formatCurrencyValue(highestSupplyPrice)
                        : "Chưa có dữ liệu";
                    const hasPromoForRow = hasValidPromoRatio(
                      item.pctPromo,
                      item.pctKhach,
                      item.pctCtv
                    );
                    const isDeletingCurrent =
                      deleteProductState.product?.id === item.id &&
                      deleteProductState.loading;
                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          className="bg-gradient-to-r from-indigo-950/70 via-slate-900/60 to-indigo-950/70 hover:from-indigo-900/70 hover:via-indigo-800/50 hover:to-indigo-900/70 cursor-pointer transition"
                          onClick={() => handleToggleProductDetails(item)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-start gap-3">
                              <ChevronDownIcon
                                className={`mt-1 h-4 w-4 text-white/60 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                              <div>
                                <div className="text-sm font-semibold text-white">
                                  {item.packageName}
                                </div>
                                <div className="text-xs text-white/70">
                                  {item.variantLabel}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-white">
                              {formatCurrencyValue(item.wholesalePrice)}
                            </div>
                            <div className="text-xs text-white/70">
                              {formatRateDescription({
                                multiplier: item.pctCtv,
                                price: item.wholesalePrice,
                                basePrice: item.baseSupplyPrice,
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-amber-300">
                              {formatCurrencyValue(item.retailPrice)}
                            </div>
                            <div className="text-xs text-white/70">
                              {formatRateDescription({
                                multiplier: item.pctKhach,
                                price: item.retailPrice,
                                basePrice: item.baseSupplyPrice,
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {hasValidPromoRatio(
                              item.pctPromo,
                              item.pctKhach,
                              item.pctCtv
                            ) ? (
                              <>
                                <div className="text-sm font-semibold text-pink-200">
                                  {formatCurrencyValue(item.promoPrice)}
                                </div>
                                <div className="text-xs text-white/70">
                                  {formatPromoPercent(item.pctPromo) ?? "-"}
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-white/60">-</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col items-center">
                              <button
                                type="button"
                                onClick={handleToggleClick}
                                className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-inner transition ${
                                  resolvedIsActive
                                    ? "border-emerald-200 bg-emerald-500 text-white"
                                    : "border-white/20 bg-white/10 text-white/60"
                                }`}
                                aria-pressed={resolvedIsActive}
                              >
                                <PowerIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white">
                              {formattedUpdated}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                className="text-blue-300 hover:text-blue-200"
                                onClick={(event) =>
                                  handleStartProductEdit(event, item)
                                }
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                className={`text-rose-400 hover:text-rose-300 ${
                                  isDeletingCurrent
                                    ? "opacity-60 cursor-not-allowed"
                                    : ""
                                }`}
                                onClick={(event) =>
                                  handleRequestDeleteProduct(event, item)
                                }
                                disabled={isDeletingCurrent}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isEditingProduct && currentEditForm && (
                          <tr>
                            <td colSpan={7} className="px-6 pb-6">
                              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/80 via-slate-900/70 to-indigo-950/80 shadow-lg px-6 py-5 space-y-6 text-white">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">
                                      Thông Tin Sản Phẩm
                                    </p>
                                    <div className="mt-4 space-y-4">
                                      <div>
                                        <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                                          Tên Sản Phẩm
                                        </label>
                                        <input
                                          type="text"
                                          className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/40"
                                          value={currentEditForm.packageName}
                                          onChange={(event) =>
                                            handleProductEditChange(
                                              "packageName",
                                              event.target.value
                                            )
                                          }
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                                          Gói Sản Phẩm
                                        </label>
                                        <input
                                          type="text"
                                          className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/40"
                                          value={currentEditForm.packageProduct}
                                          onChange={(event) =>
                                            handleProductEditChange(
                                              "packageProduct",
                                              event.target.value
                                            )
                                          }
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                                          Mã Sản Phẩm
                                        </label>
                                        <input
                                          type="text"
                                          className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-sky-300/50 focus:ring-2 focus:ring-sky-200/40"
                                          value={currentEditForm.sanPham}
                                          onChange={(event) =>
                                            handleProductEditChange(
                                              "sanPham",
                                              event.target.value
                                            )
                                          }
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-200">
                                      Tỷ Giá
                                    </p>
                                    <div className="mt-4 space-y-4">
                                      <div>
                                        <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                                          Tỷ Giá CTV
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-purple-300/50 focus:ring-2 focus:ring-purple-200/40 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                          value={currentEditForm.pctCtv}
                                          onChange={(event) =>
                                            handleProductEditChange(
                                              "pctCtv",
                                              event.target.value
                                            )
                                          }
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                                          Tỷ Giá Khách
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-purple-300/50 focus:ring-2 focus:ring-purple-200/40 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                          value={currentEditForm.pctKhach}
                                          onChange={(event) =>
                                            handleProductEditChange(
                                              "pctKhach",
                                              event.target.value
                                            )
                                          }
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                                          Tỷ giá khuyến mãi
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 shadow-inner focus:border-purple-300/50 focus:ring-2 focus:ring-purple-200/40 appearance-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                          value={currentEditForm.pctPromo}
                                          onChange={(event) =>
                                            handleProductEditChange(
                                              "pctPromo",
                                              event.target.value
                                            )
                                          }
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {currentEditForm && (
                                  <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-indigo-950/70 via-slate-900/70 to-indigo-950/80 p-4 shadow-lg backdrop-blur">
                                    <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-white/80 sm:flex-row sm:items-center sm:justify-between">
                                      <span>Giá dự kiến theo tỷ giá</span>
                                      <span className="text-amber-200 normal-case font-medium">
                                        Giá nguồn cao nhất:{" "}
                                        <span className="font-semibold">
                                          {highestSupplyPriceDisplay}
                                        </span>
                                      </span>
                                    </div>
                                    <div
                                      className={`mt-4 grid gap-3 text-center text-sm ${
                                        showPreviewPromo
                                          ? "md:grid-cols-3"
                                          : "md:grid-cols-2"
                                      }`}
                                    >
                                      <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 shadow-lg backdrop-blur-sm">
                                        <p className="text-xs uppercase text-white/70">
                                          Giá Sỉ dự kiến
                                        </p>
                                        <p className="mt-1 text-lg font-semibold text-white">
                                          {formatCurrencyValue(
                                            previewWholesalePrice
                                          )}
                                        </p>
                                        <p className="text-[11px] text-white/70">
                                          {currentEditForm.pctCtv
                                            ? `Tỷ giá: ${currentEditForm.pctCtv}`
                                            : "Nhập tỷ giá CTV"}
                                        </p>
                                      </div>
                                      <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 shadow-lg backdrop-blur-sm">
                                        <p className="text-xs uppercase text-white/70">
                                          Giá Khách dự kiến
                                        </p>
                                        <p className="mt-1 text-lg font-semibold text-white">
                                          {formatCurrencyValue(
                                            previewRetailPrice
                                          )}
                                        </p>
                                        <p className="text-[11px] text-white/70">
                                          {currentEditForm.pctKhach
                                            ? `Tỷ giá: ${currentEditForm.pctKhach}`
                                            : "Nhập tỷ giá khách"}
                                        </p>
                                      </div>
                                      {showPreviewPromo && (
                                        <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 shadow-lg backdrop-blur-sm">
                                          <p className="text-xs uppercase text-white/70">
                                            Giá Khuyến mãi dự kiến
                                          </p>
                                          <p className="mt-1 text-lg font-semibold text-white">
                                            {formatCurrencyValue(
                                              previewPromoPrice
                                            )}
                                          </p>
                                          <p className="text-[11px] text-white/70">
                                            {previewPromoPercentLabel ??
                                              "Nhập tỷ giá khuyến mãi"}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {productEditError && (
                                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                                    {productEditError}
                                  </div>
                                )}
                                <div className="flex flex-wrap justify-end gap-3">
                                <button
                                  type="button"
                                  className="inline-flex items-center rounded-xl border border-white/25 bg-white/10 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-white/60 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={handleCancelProductEdit}
                                  disabled={isSavingProductEdit}
                                >
                                    Hủy Bỏ
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-flex items-center rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-200/50 hover:opacity-90 disabled:opacity-60"
                                    onClick={handleSubmitProductEdit}
                                    disabled={isSavingProductEdit}
                                  >
                                    {isSavingProductEdit
                                      ? "Đang Lưu..."
                                      : "Lưu Thay Đổi"}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="px-6 pb-6">
                              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 text-white p-4">
                                <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-indigo-950/80 via-slate-900/70 to-indigo-950/80 shadow-lg text-white px-6 py-5 space-y-4">
                                  <div className="text-center">
                                    <p className="text-sm font-semibold text-white">
                                      Chi tiết Giá Sản Phẩm
                                    </p>
                                  </div>
                                  <div
                                    className={`grid gap-4 text-sm text-center ${
                                      hasPromoForRow
                                        ? "md:grid-cols-4"
                                        : "md:grid-cols-3"
                                    }`}
                                  >
                                    <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 flex flex-col items-center">
                                      <p className="text-xs uppercase text-white/70">
                                        Giá Nguồn Thấp Nhất
                                      </p>
                                      <p className="mt-1 text-lg font-semibold text-white">
                                        {formatCurrencyValue(cheapestPrice)}
                                      </p>
                                      <p className="text-xs text-white/70">
                                        {cheapestSupplierName}
                                      </p>
                                    </div>
                                    <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 flex flex-col items-center">
                                      <p className="text-xs uppercase text-white/70">
                                        Giá Sỉ Hiện Tại
                                      </p>
                                      <p className="mt-1 text-lg font-semibold text-white">
                                        {formatCurrencyValue(
                                          item.wholesalePrice
                                        )}
                                      </p>
                                    </div>
                                    <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 flex flex-col items-center">
                                      <p className="text-xs uppercase text-white/70">
                                        Giá Khách Hiện Tại
                                      </p>
                                      <p className="mt-1 text-lg font-semibold text-white">
                                        {formatCurrencyValue(item.retailPrice)}
                                      </p>
                                    </div>
                                    {hasPromoForRow && (
                                      <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 flex flex-col items-center">
                                        <p className="text-xs uppercase text-white/70">
                                          Giá Khuyến Mãi Hiện Tại
                                        </p>
                                        <p className="mt-1 text-lg font-semibold text-white">
                                          {formatCurrencyValue(item.promoPrice)}
                                        </p>
                                        <p className="text-xs text-white/70">
                                          {formatPromoPercent(item.pctPromo) ??
                                            "-"}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="rounded-2xl border border-white/15 overflow-hidden">
                                    <div className="flex justify-end bg-white/5 px-4 py-2 border-b border-white/10">
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white shadow-sm ring-1 ring-white/20 hover:bg-white/15 disabled:opacity-50"
                                        onClick={() =>
                                          handleStartAddSupplierRow(item.id)
                                        }
                                        disabled={Boolean(pendingNewSupply)}
                                      >
                                        <PlusCircleIcon className="h-4 w-4" />
                                        Thêm Nguồn
                                      </button>
                                    </div>
                                    <table className="w-full text-sm">
                                      <thead className="bg-white/5 text-[11px] uppercase text-white/70 tracking-wide">
                                        <tr>
                                          <th className="px-4 py-2 text-left">
                                            NCC
                                          </th>
                                          <th className="px-4 py-2 text-center">
                                            Giá Nhập
                                          </th>
                                          <th className="px-4 py-2 text-center">
                                            Lợi Nhuận
                                          </th>
                                          <th className="px-4 py-2 text-center">
                                            Thao Tác
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {supplyState?.loading ? (
                                          <tr>
                                            <td
                                              colSpan={4}
                                              className="px-4 py-3 text-center text-xs text-white/70"
                                            >
                                              Đang Tải Dữ Liệu
                                            </td>
                                          </tr>
                                        ) : supplyState?.error ? (
                                          <tr>
                                            <td
                                              colSpan={4}
                                              className="px-4 py-3 text-center text-xs text-white space-x-2"
                                            >
                                              <span>{supplyState.error}</span>
                                              <button
                                                type="button"
                                                className="text-red-400 hover:text-red-200 hover:underline text-xs"
                                                onClick={handleReloadSupply}
                                              >
                                                Thử Lại
                                              </button>
                                            </td>
                                          </tr>
                                        ) : supplierItems.length === 0 &&
                                          composedSupplierRows.length === 0 ? (
                                          <tr>
                                            <td
                                              colSpan={4}
                                              className="px-4 py-3 text-center text-xs text-white/70"
                                            >
                                              Chưa có dữ liệu từ NCC
                                            </td>
                                          </tr>
                                        ) : (
                                          composedSupplierRows.map((row) => {
                                            if (
                                              row.kind === "existing" &&
                                              row.supplier
                                            ) {
                                              const supplier = row.supplier;
                                              const rowKey = buildSupplyRowKey(
                                                item.id,
                                                supplier.sourceId
                                              );
                                              const isRowEditing = Boolean(
                                                editingSupplyRows[rowKey]
                                              );
                                              const isRowSaving = Boolean(
                                                savingSupplyRows[rowKey]
                                              );
                                              const inputValue =
                                                supplyPriceDrafts[rowKey] ??
                                                (
                                                  supplier.price ?? ""
                                                ).toString();
                                              const inputError =
                                                supplyRowErrors[rowKey];
                                              const inputDisabled =
                                                !isRowEditing || isRowSaving;
                                              const displayPrice =
                                                formatCurrencyValue(
                                                  supplier.price
                                                );

                                              return (
                                                <tr
                                                  key={rowKey}
                                                  className="border-t border-white/15"
                                                >
                                                  <td className="px-4 py-3 text-sm text-white text-center">
                                                    {supplier.sourceName}
                                                  </td>
                                                  <td className="px-4 py-3">
                                                    {isRowEditing ? (
                                                      <div className="flex flex-col items-center">
                                                        <div className="flex items-center gap-1">
                                                          <input
                                                            type="number"
                                                            min={0}
                                                            step="1000"
                                                            value={inputValue}
                                                            disabled={
                                                              inputDisabled
                                                            }
                                                            onChange={(event) =>
                                                              handleSupplyInputChange(
                                                                item.id,
                                                                supplier.sourceId,
                                                                event.target
                                                                  .value
                                                              )
                                                            }
                                                            className={`w-28 rounded-lg border px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                                                              inputDisabled
                                                                ? "border-white/25 bg-white/10 text-white/70"
                                                                : "border-blue-300/50 focus:border-blue-400 focus:ring-blue-300/40"
                                                            } ${
                                                              inputError
                                                                ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                                                                : ""
                                                            }`}
                                                          />
                                                          <span className="text-xs text-white/70">
                                                            ?
                                                          </span>
                                                        </div>
                                                        {inputError && (
                                                          <p className="mt-1 text-[11px] text-red-500">
                                                            {inputError}
                                                          </p>
                                                        )}
                                                      </div>
                                                    ) : (
                                                      <div className="flex justify-center">
                                                        <span className="inline-flex min-w-[112px] justify-center rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white">
                                                          {displayPrice}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </td>
                                                  <td className="px-4 py-3 text-center text-xs text-white/70">
                                                    {formatProfitRange(
                                                      supplier.price,
                                                      item.wholesalePrice,
                                                      item.retailPrice
                                                    )}
                                                  </td>
                                                  <td className="px-4 py-3">
                                                    {isRowEditing ? (
                                                      <div className="flex items-center justify-center gap-2">
                                                        <button
                                                          type="button"
                                                          className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600/20 text-green-200 hover:bg-green-500/30 disabled:opacity-60"
                                                          disabled={isRowSaving}
                                                          onClick={() =>
                                                            handleConfirmSupplyEditing(
                                                              item.id,
                                                              supplier.sourceId,
                                                              productKey,
                                                              item.sanPhamRaw
                                                            )
                                                          }
                                                        >
                                                          <CheckIcon className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                          type="button"
                                                          className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600/20 text-red-200 hover:bg-red-500/30 disabled:opacity-60"
                                                          disabled={isRowSaving}
                                                          onClick={() =>
                                                            handleCancelSupplyEditing(
                                                              item.id,
                                                              supplier.sourceId
                                                            )
                                                          }
                                                        >
                                                          <XMarkIcon className="h-4 w-4" />
                                                        </button>
                                                      </div>
                                                    ) : (
                                                      <div className="flex items-center justify-center gap-2">
                                                        <button
                                                          type="button"
                                                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-white/80 hover:border-white/40 hover:text-white disabled:opacity-60"
                                                          disabled={isRowSaving}
                                                          onClick={() =>
                                                            handleStartEditingSupply(
                                                              item.id,
                                                              supplier.sourceId,
                                                              supplier.price
                                                            )
                                                          }
                                                        >
                                                          <PencilIcon className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                          type="button"
                                                          className="flex h-8 w-8 items-center justify-center rounded-full border border-red-200/60 text-red-200 hover:border-red-200 hover:bg-red-500/10 disabled:opacity-60"
                                                          disabled={isRowSaving}
                                                          onClick={() =>
                                                            handleDeleteSupplyRow(
                                                              item.id,
                                                              supplier.sourceId,
                                                              productKey,
                                                              item.sanPhamRaw
                                                            )
                                                          }
                                                        >
                                                          <XCircleIcon className="h-4 w-4" />
                                                        </button>
                                                      </div>
                                                    )}
                                                  </td>
                                                </tr>
                                              );
                                            }

                                            if (
                                              row.kind === "new" &&
                                              pendingNewSupply
                                            ) {
                                              const draft = pendingNewSupply;
                                              return (
                                                <React.Fragment
                                                  key={`new-${item.id}`}
                                                >
                                                  <tr className="border-t border-dashed border-sky-100 bg-sky-50/40">
                                                    <td className="px-4 py-3">
                                                      <input
                                                        type="text"
                                                        className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                                                        placeholder="Tên Nguồn"
                                                        value={draft.sourceName}
                                                        onChange={(event) =>
                                                          handleNewSupplierInputChange(
                                                            item.id,
                                                            "sourceName",
                                                            event.target.value
                                                          )
                                                        }
                                                        disabled={
                                                          draft.isSaving
                                                        }
                                                      />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                      <div className="flex items-center justify-center gap-1">
                                                        <input
                                                          type="number"
                                                          min={0}
                                                          step="1000"
                                                          className="w-28 rounded-lg border border-sky-200 bg-white px-2 py-1 text-center text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-200 appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                          placeholder="Giá Nhập"
                                                          value={draft.price}
                                                          onChange={(event) =>
                                                            handleNewSupplierInputChange(
                                                              item.id,
                                                              "price",
                                                              event.target.value
                                                            )
                                                          }
                                                          disabled={
                                                            draft.isSaving
                                                          }
                                                        />
                                                        <span className="text-xs text-white/70">
                                                          ?
                                                        </span>
                                                      </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-xs text-white/70">
                                                      -
                                                    </td>
                                                    <td className="px-4 py-3">
                                                      <div className="flex items-center justify-center gap-2">
                                                        <button
                                                          type="button"
                                                          className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600/20 text-green-200 hover:bg-green-500/30 disabled:opacity-60"
                                                          disabled={
                                                            draft.isSaving
                                                          }
                                                          onClick={() =>
                                                            handleConfirmAddSupplierRow(
                                                              item
                                                            )
                                                          }
                                                        >
                                                          <CheckIcon className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                          type="button"
                                                          className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600/20 text-red-200 hover:bg-red-500/30 disabled:opacity-60"
                                                          disabled={
                                                            draft.isSaving
                                                          }
                                                          onClick={() =>
                                                            handleCancelAddSupplierRow(
                                                              item.id
                                                            )
                                                          }
                                                        >
                                                          <XMarkIcon className="h-4 w-4" />
                                                        </button>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                  {draft.error && (
                                                    <tr>
                                                      <td
                                                        colSpan={4}
                                                        className="px-4 pb-3 text-center text-xs text-red-200"
                                                      >
                                                        {draft.error}
                                                      </td>
                                                    </tr>
                                                  )}
                                                </React.Fragment>
                                              );
                                            }

                                            return null;
                                          })
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default Pricing;
