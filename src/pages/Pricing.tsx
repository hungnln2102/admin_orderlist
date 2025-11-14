import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  UserPlusIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  PowerIcon,
} from "@heroicons/react/24/outline";
import { API_ENDPOINTS } from "../constants";
import StatCard, { STAT_CARD_ACCENTS } from "../components/StatCard";
import GradientButton from "../components/GradientButton";

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
  return monthsLabel || formatSkuLabel(sanPham) || "Không xác định";
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

const hasValidPromoRatio = (
  value?: number | null,
  pctKhach?: number | null
): boolean => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return false;
  }
  if (
    typeof pctKhach === "number" &&
    Number.isFinite(pctKhach) &&
    pctKhach - value > 1
  ) {
    return false;
  }
  return true;
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
  let effectiveRatio: number | null = null;
  if (
    typeof multiplier === "number" &&
    Number.isFinite(multiplier) &&
    multiplier > 0
  ) {
    effectiveRatio = multiplier;
  } else if (
    typeof price === "number" &&
    Number.isFinite(price) &&
    price > 0 &&
    typeof basePrice === "number" &&
    Number.isFinite(basePrice) &&
    basePrice > 0
  ) {
    effectiveRatio = price / basePrice;
  }

  if (!effectiveRatio || !Number.isFinite(effectiveRatio)) {
    return "-";
  }

  const percent = effectiveRatio * 100;
  return `${percent.toFixed(1)}%`;
};

const formatCurrencyValue = (value?: number | null): string => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "-";
  }
  return currencyFormatter.format(value);
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
  if (value === 0) return currencyFormatter.format(0);
  if (value > 0) return currencyFormatter.format(value);
  return `-${currencyFormatter.format(Math.abs(value))}`;
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
  wholesalePrice?: number | null,
  fallbackBasePrice?: number | null
): number | null => {
  if (
    typeof pctKhach !== "number" ||
    !Number.isFinite(pctKhach) ||
    pctKhach <= 0
  ) {
    return null;
  }
  if (
    pctPromo !== null &&
    pctPromo !== undefined &&
    (!Number.isFinite(pctPromo) || pctPromo < 0)
  ) {
    return null;
  }

  const ratioDiff = pctKhach - (pctPromo ?? 0);
  if (ratioDiff <= 0) {
    return null;
  }

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

  const cappedRatio = Math.min(1, ratioDiff);
  return multiplyValue(baseValue, cappedRatio);
};

const mapProductPriceRow = (
  row: any,
  fallbackId: number
): ProductPricingRow => {
  const packageName = cleanupLabel(row?.package ?? row?.package_label);
  const packageProduct = cleanupLabel(
    row?.package_product ?? row?.package_product_label
  );
  const sanPhamRaw = (row?.san_pham_label ?? row?.san_pham ?? "")
    .toString()
    .trim();

  return {
    id: Number.isFinite(Number(row?.id)) ? Number(row?.id) : fallbackId,
    packageName: packageName || "Không xác định",
    packageProduct,
    sanPhamRaw,
    variantLabel: buildVariantLabel(packageProduct, sanPhamRaw),
    pctCtv: toNumberOrNull(row?.pct_ctv),
    pctKhach: toNumberOrNull(row?.pct_khach),
    pctPromo: toNumberOrNull(row?.pct_promo),
    isActive: parseBoolean(row?.is_active),
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
      typeof row?.update === "string"
        ? row.update
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

  const fetchProductPrices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.PRODUCT_PRICES}`
      );
      if (!response.ok) {
        throw new Error("Không thể tải dữ liệu product_price từ máy chủ.");
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
      console.error("Lỗi khi tải product_price:", err);
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
          `${API_BASE}/api/products/all-prices-by-name/${encodeURIComponent(
            productName
          )}`
        );
        if (!response.ok) {
          throw new Error("Không thể tải giá nhà cung cấp cho sản phẩm");
        }
        const payload = await response.json();
        const items: SupplyPriceItem[] = Array.isArray(payload)
          ? sortSupplyItems(
              payload.map((entry: any, index: number) => ({
                sourceId: Number.isFinite(Number(entry?.source_id))
                  ? Number(entry.source_id)
                  : index,
                sourceName:
                  cleanupLabel(entry?.source_name) ||
                  `Nhà cung cấp #${Number(entry?.source_id) || index + 1}`,
                price: toNumberOrNull(entry?.price),
                lastOrderDate:
                  typeof entry?.last_order_date === "string"
                    ? entry.last_order_date
                    : null,
              }))
            )
          : [];

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
                : "Không thể tải giá cho nhà cung cấp",
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
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.BANK_LIST}`);
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
        Array.from(cachedNames).map((name) =>
          fetchSupplyPricesForProduct(name)
        )
      );
    } catch (error) {
      console.error("Failed to refresh pricing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchProductPrices, fetchSupplyPricesForProduct, supplyPriceMap, isRefreshing]);

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
        [rowKey]: "Giá nhập không phải là số âm.",
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
          if (updatedMax !== previousMax || (wasHighestSupplier && priceChanged)) {
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
      try {
        await fetchSupplyPricesForProduct(productName);
      } catch (error) {
        console.error("Failed to refresh supply prices:", error);
      }
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
      setProductEditError("Tỷ giá khách phải lớn hơn 0");
      return;
    }
    if (nextPctPromo !== null && nextPctPromo < 0) {
      setProductEditError("Tỷ giá khuyến mãi phải lớn hơn hoặc bằng 0");
      return;
    }
    if (nextPctPromo !== null && nextPctKhach && nextPctPromo >= nextPctKhach) {
      setProductEditError("Tỷ giá khuyến mãi phải nhỏ hơn tỷ giá khách");
      return;
    }
    if (
      nextPctPromo !== null &&
      nextPctKhach &&
      nextPctKhach - nextPctPromo > 1
    ) {
      setProductEditError("Giá khuyến mãi không được vượt giá sỉ");
      return;
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
        err instanceof Error ? err.message : "Không thể cập nhạt giá sản phẩm"
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
    if (pctPromoValue !== null && pctPromoValue < 0) {
      setCreateError("Tỷ giá khuyến mãi phải lớn hơn hoặc bằng 0.");
      return;
    }
    if (
      pctPromoValue !== null &&
      pctKhachValue &&
      pctPromoValue >= pctKhachValue
    ) {
      setCreateError("Tỷ giá khuyến mãi phải nhỏ hơn tỷ giá khách.");
      return;
    }
    if (
      pctPromoValue !== null &&
      pctKhachValue &&
      pctKhachValue - pctPromoValue > 1
    ) {
      setCreateError("Giá khuyến mãi không được vượt giá sỉ.");
      return;
    }

    const normalizedSuppliers = createSuppliers.map((entry) => ({
      sourceName: entry.sourceName.trim(),
      numberBank: entry.numberBank.trim(),
      bankBin: entry.bankBin,
      price: Number(entry.price),
    }));

    for (const supplier of normalizedSuppliers) {
      if (!supplier.sourceName) {
        setCreateError("Mỗi nhà cung cấp phải có tên hợp lệ.");
        return;
      }
      if (!supplier.bankBin) {
        setCreateError("Mỗi nhà cung cấp phải chọn ngân hàng");
        return;
      }
      if (!Number.isFinite(supplier.price) || supplier.price <= 0) {
        setCreateError("Giá nhập của nhà cung cấp phải lớn hơn 0");
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
        }
      );

      if (!response.ok) {
        throw new Error("Lỗi khi cập nhật trạng thái sản phẩm");
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
      alert("Cập nhật tình trạng thất bại. Vui lòng thử lại");
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
        name: "Tổng số mã sản phẩm",
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
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            <button
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              onClick={handleCloseCreateModal}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <div className="px-6 py-8 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Thêm sản phẩm mới
                </h2>
                <p className="text-sm text-gray-500">
                  Nhập thông tin sản phẩm, nhà cung cấp, tỷ giá
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-sky-100/40 p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                    Thông Tin Sản Phẩm
                  </p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Sản Phẩm
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm shadow-inner focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
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
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Gói Sản Phẩm
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm shadow-inner focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
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
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Mã Sản Phẩm
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm shadow-inner focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
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
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Tỷ Giá CTV
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="mt-1 w-full rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm shadow-inner focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
                        value={createForm.pctCtv}
                        onChange={(event) =>
                          handleCreateFormChange("pctCtv", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Tỷ Giá Khách
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="mt-1 w-full rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm shadow-inner focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
                        value={createForm.pctKhach}
                        onChange={(event) =>
                          handleCreateFormChange("pctKhach", event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Tỷ Giá Khuyến Mãi
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="mt-1 w-full rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm shadow-inner focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Thông Tin Nhà Cung Cấp
                  </p>
                  <div className="space-y-4">
                    {createSuppliers.map((supplier, index) => (
                      <div
                        key={supplier.id}
                        className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-inner"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-gray-700">
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
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Tên Nhà Cung Cấp
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
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
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
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
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
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Ngân hàng
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
                              <p className="mt-1 text-[11px] text-gray-400">
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
                      Thêm Nhà Cung Cấp
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
                  className="inline-flex items-center rounded-xl bg-gradient-to-r from-gray-200 to-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 shadow hover:opacity-90 disabled:opacity-60"
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
                  {isSubmittingCreate ? "Dang luu..." : "Luu san pham"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bảng giá sản phẩm
            </h1>
          </div>
          <div className="mt-4 sm:mt-0">
            <GradientButton icon={PlusIcon} onClick={handleOpenCreateModal}>
              Thêm Sản Phẩm
            </GradientButton>
          </div>
        </div>

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

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Tạm dừng</option>
            </select>

          <GradientButton
            className="w-full justify-center"
            type="button"
            onClick={handleRefreshAll}
            disabled={isLoading || isRefreshing}
          >
            {isLoading || isRefreshing ? "Đang đồng bộ..." : "Đồng bộ lại"}
          </GradientButton>
          </div>
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sản Phẩm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Giá Sỉ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Giá Lẻ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Giá Khuyến Mãi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tình Trạng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cập Nhật
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Thao Tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-sm text-gray-500"
                    >
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : filteredPricing.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-sm text-gray-500"
                    >
                      {error
                        ? "Không thể tải dữ liệu. Vui lòng thử lại."
                        : "Không có sản phẩm nào phù hợp bộ lọc."}
                    </td>
                  </tr>
                ) : (
                  filteredPricing.map((item) => {
                    const isExpanded = expandedProductId === item.id;
                    const productKey = normalizeProductKey(item.sanPhamRaw);
                    const supplyState = supplyPriceMap[productKey];
                    const supplierItems = supplyState?.items ?? [];
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
                          previewWholesalePrice,
                          highestSupplyPrice
                        )
                      : null;
                    const promoRatioForPreview =
                      previewRatios?.pctPromo ?? null;
                    const promoDiffWithinWholesale =
                      typeof promoRatioForPreview === "number" &&
                      promoRatioForPreview > 0 &&
                      typeof previewRatios?.pctKhach === "number" &&
                      Number.isFinite(previewRatios.pctKhach) &&
                      previewRatios.pctKhach - promoRatioForPreview <= 1;
                    const showPreviewPromo =
                      promoDiffWithinWholesale &&
                      Number.isFinite(previewPromoPrice ?? NaN);
                    const highestSupplyPriceDisplay =
                      typeof highestSupplyPrice === "number" &&
                      Number.isFinite(highestSupplyPrice) &&
                      highestSupplyPrice > 0
                        ? formatCurrencyValue(highestSupplyPrice)
                        : "Chưa có dữ liệu";
                    const hasPromoForRow = hasValidPromoRatio(
                      item.pctPromo,
                      item.pctKhach
                    );
                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleToggleProductDetails(item)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-start gap-3">
                              <ChevronDownIcon
                                className={`mt-1 h-4 w-4 text-gray-400 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {item.packageName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.variantLabel}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              {formatCurrencyValue(item.wholesalePrice)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatRateDescription({
                                multiplier: item.pctCtv,
                                price: item.wholesalePrice,
                                basePrice: item.baseSupplyPrice,
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-blue-600">
                              {formatCurrencyValue(item.retailPrice)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatRateDescription({
                                multiplier: item.pctKhach,
                                price: item.retailPrice,
                                basePrice: item.baseSupplyPrice,
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {hasValidPromoRatio(item.pctPromo, item.pctKhach) ? (
                              <>
                                <div className="text-sm font-semibold text-fuchsia-600">
                                  {formatCurrencyValue(item.promoPrice)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.pctPromo
                                    ? `${item.pctPromo.toFixed(2)}x`
                                    : "-"}
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-gray-400">-</div>
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
                                    : "border-gray-200 bg-gray-200 text-gray-500"
                                }`}
                                aria-pressed={resolvedIsActive}
                              >
                                <PowerIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formattedUpdated}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              className="text-blue-600 hover:text-blue-900 mr-3"
                              onClick={(event) =>
                                handleStartProductEdit(event, item)
                              }
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                        {isEditingProduct && currentEditForm && (
                          <tr>
                            <td colSpan={7} className="px-6 pb-6">
                              <div className="rounded-2xl border border-indigo-50 bg-white shadow-sm px-6 py-5 space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-sky-100/40 p-5 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                                      Thông Tin Sản Phẩm
                                    </p>
                                    <div className="mt-4 space-y-4">
                                      <div>
                                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                          Tên Sản Phẩm
                                        </label>
                                        <input
                                          type="text"
                                          className="mt-1 w-full rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm shadow-inner focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
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
                                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                          Gói Sản Phẩm
                                        </label>
                                        <input
                                          type="text"
                                          className="mt-1 w-full rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm shadow-inner focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
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
                                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                          Mã Sản Phẩm
                                        </label>
                                        <input
                                          type="text"
                                          className="mt-1 w-full rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm shadow-inner focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
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
                                  <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-white via-purple-50 to-purple-100/40 p-5 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                                      Tỷ Giá
                                    </p>
                                    <div className="mt-4 space-y-4">
                                      <div>
                                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                          Tỷ Giá CTV
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="mt-1 w-full rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm shadow-inner focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
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
                                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                          Tỷ Giá Khách
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="mt-1 w-full rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm shadow-inner focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
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
                                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                          Tỷ Giá Khuyến Mãi
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="mt-1 w-full rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm shadow-inner focus:border-purple-300 focus:ring-2 focus:ring-purple-200"
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
                                  <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-white via-amber-50 to-amber-100/40 p-4 shadow-inner">
                                    <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-amber-700 sm:flex-row sm:items-center sm:justify-between">
                                      <span>Giá dự kiến theo tỷ giá</span>
                                      <span className="text-amber-600 normal-case font-medium">
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
                                    <div className="rounded-xl border border-white/70 bg-white/90 px-4 py-3 shadow-sm">
                                      <p className="text-xs uppercase text-gray-500">
                                        Giá sỉ dự kiến
                                      </p>
                                      <p className="mt-1 text-lg font-semibold text-gray-900">
                                          {formatCurrencyValue(
                                            previewWholesalePrice
                                          )}
                                        </p>
                                        <p className="text-[11px] text-gray-500">
                                          {currentEditForm.pctCtv
                                            ? `Tỷ giá: ${currentEditForm.pctCtv}`
                                            : "Nhập tỷ giá CTV"}
                                        </p>
                                      </div>
                                    <div className="rounded-xl border border-white/70 bg-white/90 px-4 py-3 shadow-sm">
                                      <p className="text-xs uppercase text-gray-500">
                                        Giá lẻ dự kiến
                                      </p>
                                      <p className="mt-1 text-lg font-semibold text-gray-900">
                                        {formatCurrencyValue(
                                          previewRetailPrice
                                        )}
                                      </p>
                                      <p className="text-[11px] text-gray-500">
                                        {currentEditForm.pctKhach
                                          ? `Tỷ giá: ${currentEditForm.pctKhach}`
                                          : "Nhập tỷ giá khách"}
                                      </p>
                                    </div>
                                    {showPreviewPromo && (
                                      <div className="rounded-xl border border-white/70 bg-white/90 px-4 py-3 shadow-sm">
                                        <p className="text-xs uppercase text-gray-500">
                                          Giá khuyến mãi dự kiến
                                        </p>
                                        <p className="mt-1 text-lg font-semibold text-gray-900">
                                          {formatCurrencyValue(
                                            previewPromoPrice
                                          )}
                                        </p>
                                        <p className="text-[11px] text-gray-500">
                                          {currentEditForm.pctPromo
                                            ? `Tỷ giá: ${currentEditForm.pctPromo}`
                                            : "Nhập tỷ giá khuyến mãi"}
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
                                    className="inline-flex items-center rounded-xl bg-gradient-to-r from-gray-200 to-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 shadow hover:opacity-90 disabled:opacity-60"
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
                              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
                                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm px-6 py-5 space-y-4">
                                  <div className="text-center">
                                    <p className="text-sm font-semibold text-gray-900">
                                      Chi tiết giá sản phẩm
                                    </p>
                                  </div>
                                  <div
                                    className={`grid gap-4 text-sm text-center ${
                                      hasPromoForRow
                                        ? "md:grid-cols-4"
                                        : "md:grid-cols-3"
                                    }`}
                                  >
                                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex flex-col items-center">
                                      <p className="text-xs uppercase text-gray-500">
                                        Giá Nguồn Thấp Nhất
                                      </p>
                                      <p className="mt-1 text-lg font-semibold text-gray-900">
                                        {formatCurrencyValue(cheapestPrice)}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {cheapestSupplierName}
                                      </p>
                                    </div>
                                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex flex-col items-center">
                                      <p className="text-xs uppercase text-gray-500">
                                        Giá Sỉ Hiện Tại
                                      </p>
                                      <p className="mt-1 text-lg font-semibold text-gray-900">
                                        {formatCurrencyValue(
                                          item.wholesalePrice
                                        )}
                                      </p>
                                    </div>
                                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex flex-col items-center">
                                      <p className="text-xs uppercase text-gray-500">
                                        Giá Khách Hiện Tại
                                      </p>
                                      <p className="mt-1 text-lg font-semibold text-gray-900">
                                        {formatCurrencyValue(item.retailPrice)}
                                      </p>
                                    </div>
                                    {hasPromoForRow && (
                                      <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex flex-col items-center">
                                        <p className="text-xs uppercase text-gray-500">
                                          Giá Khuyến Mãi Hiện Tại
                                        </p>
                                        <p className="mt-1 text-lg font-semibold text-gray-900">
                                          {formatCurrencyValue(item.promoPrice)}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="rounded-2xl border border-gray-100 overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-50 text-[11px] uppercase text-gray-500 tracking-wide">
                                        <tr>
                                          <th className="px-4 py-2 text-left">
                                            Nhà Cung Cấp
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
                                              className="px-4 py-3 text-center text-xs text-gray-500"
                                            >
                                              Đang Tải Giá Nhập Từ Nhà Cung Cấp
                                            </td>
                                          </tr>
                                        ) : supplyState?.error ? (
                                          <tr>
                                            <td
                                              colSpan={4}
                                              className="px-4 py-3 text-center text-xs text-red-500 space-x-2"
                                            >
                                              <span>{supplyState.error}</span>
                                              <button
                                                type="button"
                                                className="text-blue-600 hover:underline text-xs"
                                                onClick={handleReloadSupply}
                                              >
                                                Thử Lại
                                              </button>
                                            </td>
                                          </tr>
                                        ) : supplierItems.length === 0 ? (
                                          <tr>
                                            <td
                                              colSpan={4}
                                              className="px-4 py-3 text-center text-xs text-gray-500"
                                            >
                                              Chưa có dữ liệu giá nhập từ nhà
                                              cung cấp
                                            </td>
                                          </tr>
                                        ) : (
                                          supplierItems.map((supplier) => {
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
                                              )?.toString();
                                            const inputError =
                                              supplyRowErrors[rowKey];
                                            const inputDisabled =
                                              !isRowEditing || isRowSaving;
                                            return (
                                              <tr
                                                key={supplier.sourceId}
                                                className="border-t border-gray-100"
                                              >
                                                <td className="px-4 py-3 text-sm text-gray-700 text-center">
                                                  {supplier.sourceName}
                                                </td>
                                                <td className="px-4 py-3">
                                                  <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-1">
                                                      <input
                                                        type="number"
                                                        min={0}
                                                        step="1000"
                                                        value={inputValue}
                                                        disabled={inputDisabled}
                                                        onChange={(event) =>
                                                          handleSupplyInputChange(
                                                            item.id,
                                                            supplier.sourceId,
                                                            event.target.value
                                                          )
                                                        }
                                                        className={`w-28 rounded-lg border px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 ${
                                                          inputDisabled
                                                            ? "border-gray-200 bg-gray-50 text-gray-500"
                                                            : "border-blue-200 focus:border-blue-500 focus:ring-blue-200"
                                                        } ${
                                                          inputError
                                                            ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                                                            : ""
                                                        }`}
                                                      />
                                                      <span className="text-xs text-gray-500">
                                                        ₫
                                                      </span>
                                                    </div>
                                                    {inputError && (
                                                      <p className="mt-1 text-[11px] text-red-500">
                                                        {inputError}
                                                      </p>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="px-4 py-3 text-center text-xs text-gray-600">
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
                                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-60"
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
                                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-60"
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
                                                    <div className="flex items-center justify-center">
                                                      <button
                                                        type="button"
                                                        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
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
                                                    </div>
                                                  )}
                                                </td>
                                              </tr>
                                            );
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
