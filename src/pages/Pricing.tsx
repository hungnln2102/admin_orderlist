import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { API_ENDPOINTS } from "../constants";
import StatCard, { STAT_CARD_ACCENTS } from "../components/StatCard";

const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) ||
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
  return String(value)
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
}

const formatRateDescription = ({
  multiplier,
  price,
  basePrice,
  label,
}: RateDescriptionInput): string => {
  const prefix = label ? `Ty gia ${label}` : "Ty gia";

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
    return `${prefix}: N/A`;
  }

  const percent = effectiveRatio * 100;
  return `${prefix}: ${percent.toFixed(1)}%`;
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

const mapProductPriceRow = (row: any, fallbackId: number): ProductPricingRow => {
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
      row?.promo_price ?? row?.gia_khuyen_mai ?? row?.gia_km
    ),
    lastUpdated:
      typeof row?.updated_at === "string"
        ? row?.updated_at
        : typeof row?.updatedAt === "string"
        ? row?.updatedAt
        : null,
  };
};

export default function Pricing() {
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
      setProductPrices(normalizedRows);
    } catch (err) {
      console.error("Lỗi khi tải product_price:", err);
      setProductPrices([]);
      setError(
        err instanceof Error ? err.message : "Không thể tải dữ liệu product_price."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSupplyPricesForProduct = useCallback(async (productName: string) => {
    const key = normalizeProductKey(productName);
    if (!key) return;
    setSupplyPriceMap((prev) => ({
      ...prev,
      [key]: {
        items: prev[key]?.items ?? [],
        loading: true,
        error: null,
      },
    }));

    try {
      const response = await fetch(
        `${API_BASE}/api/products/all-prices-by-name/${encodeURIComponent(
          productName
        )}`
      );
      if (!response.ok) {
        throw new Error("Không thể tải giá nhà cung cấp cho sản phẩm.");
      }
      const payload = await response.json();
      const items: SupplyPriceItem[] = Array.isArray(payload)
        ? payload
            .map((entry: any, index: number) => ({
              sourceId: Number.isFinite(Number(entry?.source_id))
                ? Number(entry.source_id)
                : index,
              sourceName:
                cleanupLabel(entry?.source_name) ||
                `Nha cung cap #${Number(entry?.source_id) || index + 1}`,
              price: toNumberOrNull(entry?.price),
              lastOrderDate:
                typeof entry?.last_order_date === "string"
                  ? entry.last_order_date
                  : null,
            }))
            .sort((a, b) => {
              const priceA = a.price ?? Number.POSITIVE_INFINITY;
              const priceB = b.price ?? Number.POSITIVE_INFINITY;
              if (priceA !== priceB) return priceA - priceB;
              const tsA = Date.parse(a.lastOrderDate ?? "") || 0;
              const tsB = Date.parse(b.lastOrderDate ?? "") || 0;
              return tsB - tsA;
            })
        : [];

      setSupplyPriceMap((prev) => ({
        ...prev,
        [key]: {
          loading: false,
          error: null,
          items,
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
              : "Không thể tải giá nhà cung cấp.",
        },
      }));
    }
  }, []);

  useEffect(() => {
    fetchProductPrices();
  }, [fetchProductPrices]);

  const handleToggleProductDetails = (product: ProductPricingRow) => {
    const nextId = expandedProductId === product.id ? null : product.id;
    setExpandedProductId(nextId);
    if (nextId === product.id) {
      const key = normalizeProductKey(product.sanPhamRaw);
      const currentState = supplyPriceMap[key];
      if (!currentState || (!currentState.loading && currentState.items.length === 0)) {
        fetchSupplyPricesForProduct(product.sanPhamRaw);
      }
    }
  };

  const filteredPricing = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return productPrices.filter((item) => {
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
    });
  }, [productPrices, searchTerm, statusFilter]);

  const pricingStats = useMemo<PricingStat[]>(() => {
    const total = productPrices.length;
    const activeCount = productPrices.filter((item) => item.isActive).length;
    const inactiveCount = total - activeCount;
    const avgCtv =
      total > 0
        ? productPrices.reduce((sum, item) => sum + (item.pctCtv ?? 0), 0) / total
        : 0;
    const avgKhach =
      total > 0
        ? productPrices.reduce((sum, item) => sum + (item.pctKhach ?? 0), 0) / total
        : 0;

    const formatAvgRate = (value: number) => {
      if (!value || !Number.isFinite(value)) return "-";
      const percent = (value - 1) * 100;
      if (!Number.isFinite(percent)) return "-";
      return `${percent.toFixed(1)}%`;
    };

    return [
      {
        name: "Tong so goi",
        value: total.toString(),
        icon: CurrencyDollarIcon,
        accent: "emerald",
        subtitle: total > 0 ? "Tang truong" : "On dinh",
      },
      {
        name: "Dang hoat dong",
        value: activeCount.toString(),
        icon: ArrowTrendingUpIcon,
        accent: "sky",
        subtitle: activeCount > 0 ? "Tang truong" : "On dinh",
      },
      {
        name: "Tam dung",
        value: inactiveCount.toString(),
        icon: PencilIcon,
        accent: "violet",
        subtitle: inactiveCount > 0 ? "On dinh" : "Giam nhe",
      },
      {
        name: "Ty gia khach TB",
        value: formatAvgRate(avgKhach),
        icon: ArrowTrendingDownIcon,
        accent: "rose",
        subtitle: avgKhach >= avgCtv ? "Tang truong" : "Giam nhe",
      },
    ];
  }, [productPrices]);



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bảng giá sản phẩm</h1>
          <p className="mt-1 text-sm text-gray-500">
            Đồng bộ trực tiếp từ bảng product_price (Postgres)
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
            onClick={fetchProductPrices}
            disabled={isLoading}
          >
            <ArrowPathIcon
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Làm mới
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <PlusIcon className="h-4 w-4 mr-2" />
            Thêm sản phẩm
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          <button
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-60"
            onClick={fetchProductPrices}
            disabled={isLoading}
          >
            Đồng bộ lại
          </button>
        </div>
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto flex justify-center">
          <table className="min-w-[960px] w-full max-w-6xl divide-y divide-gray-200 mx-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sản Phẩm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giá Sỉ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giá Lẻ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cập Nhật
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    Đang tải dữ liệu product_price...
                  </td>
                </tr>
              ) : filteredPricing.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
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
                  const cheapestSupplier = pickCheapestSupplier(supplierItems);
                  const cheapestPrice =
                    cheapestSupplier?.price ?? item.baseSupplyPrice;
                  const cheapestSupplierName =
                    cheapestSupplier?.sourceName ?? "-";
                  const handleReloadSupply = () => {
                    fetchSupplyPricesForProduct(item.sanPhamRaw);
                  };
                  const lastUpdatedDisplay = item.lastUpdated
                    ? formatDateLabel(item.lastUpdated)
                    : "";
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
                              label: "CTV",
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
                              label: "Khách lẻ",
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {lastUpdatedDisplay}
                          </div>
                          <span
                            className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.isActive
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {item.isActive ? "Hoạt động" : "Tạm dừng"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="px-6 pb-6">
                            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
                              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm px-6 py-5 space-y-4">
                                <div className="text-center">
                                  <p className="text-sm font-semibold text-gray-900">
                                    Chi tiet gia san pham
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Theo doi nguon gia va he so hien tai cho san pham nay.
                                  </p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-3 text-sm text-center">
                                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex flex-col items-center">
                                    <p className="text-xs uppercase text-gray-500">
                                      Gia nguon thap nhat
                                    </p>
                                    <p className="mt-1 text-lg font-semibold text-gray-900">
                                      {formatCurrencyValue(cheapestPrice)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {cheapestSupplierName}
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex flex-col items-center">
                                    <p className="text-xs uppercase text-gray-500">Gia si hien tai</p>
                                    <p className="mt-1 text-lg font-semibold text-gray-900">
                                      {formatCurrencyValue(item.wholesalePrice)}
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex flex-col items-center">
                                    <p className="text-xs uppercase text-gray-500">Gia le hien tai</p>
                                    <p className="mt-1 text-lg font-semibold text-gray-900">
                                      {formatCurrencyValue(item.retailPrice)}
                                    </p>
                                  </div>
                                </div>
                                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-[11px] uppercase text-gray-500 tracking-wide">
                                      <tr>
                                        <th className="px-4 py-2 text-left">Nha cung cap</th>
                                        <th className="px-4 py-2 text-center">Gia nhap</th>
                                        <th className="px-4 py-2 text-center">
                                          Loi nhuan (Gia si - Gia le)
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {supplyState?.loading ? (
                                        <tr>
                                          <td
                                            colSpan={3}
                                            className="px-4 py-3 text-center text-xs text-gray-500"
                                          >
                                            Dang tai gia nhap tu nha cung cap...
                                          </td>
                                        </tr>
                                      ) : supplyState?.error ? (
                                        <tr>
                                          <td
                                            colSpan={3}
                                            className="px-4 py-3 text-center text-xs text-red-500 space-x-2"
                                          >
                                            <span>{supplyState.error}</span>
                                            <button
                                              type="button"
                                              className="text-blue-600 hover:underline text-xs"
                                              onClick={handleReloadSupply}
                                            >
                                              Thu lai
                                            </button>
                                          </td>
                                        </tr>
                                      ) : supplierItems.length === 0 ? (
                                        <tr>
                                          <td
                                            colSpan={3}
                                            className="px-4 py-3 text-center text-xs text-gray-500"
                                          >
                                            Chua co du lieu gia nhap tu nha cung cap.
                                          </td>
                                        </tr>
                                      ) : (
                                        supplierItems.map((supplier) => (
                                          <tr
                                            key={supplier.sourceId}
                                            className="border-t border-gray-100"
                                          >
                                          <td className="px-4 py-3 text-sm text-gray-700 text-center">
                                            {supplier.sourceName}
                                          </td>
                                          <td className="px-4 py-3 text-center font-semibold text-gray-900">
                                            {formatCurrencyValue(supplier.price)}
                                          </td>
                                          <td className="px-4 py-3 text-center text-xs text-gray-600">
                                            {formatProfitRange(
                                              supplier.price,
                                              item.wholesalePrice,
                                              item.retailPrice
                                            )}
                                            </td>
                                          </tr>
                                        ))
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
  );
}


