import { useCallback, useMemo, useState } from "react";
import { API_ENDPOINTS } from "../../../../constants";
import { ProductPricingRow, StatusFilter } from "../types";
import {
  applyBasePriceToProduct,
  mapProductPriceRow,
  normalizeProductKey,
  toTimestamp,
} from "../utils";

interface UseProductDataResult {
  currentPage: number;
  setCurrentPage: (value: number) => void;
  rowsPerPage: number;
  setRowsPerPage: (value: number) => void;
  totalRows: number;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  productPrices: ProductPricingRow[];
  setProductPrices: React.Dispatch<React.SetStateAction<ProductPricingRow[]>>;
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
  error: string | null;
  setError: (value: string | null) => void;
  statusOverrides: Record<number, boolean>;
  setStatusOverrides: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  updatedTimestampMap: Record<number, string>;
  setUpdatedTimestampMap: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  expandedProductId: number | null;
  setExpandedProductId: (value: number | null) => void;
  isRefreshing: boolean;
  setIsRefreshing: (value: boolean) => void;
  fetchProductPrices: () => Promise<void>;
  filteredPricing: ProductPricingRow[];
}

export const useProductData = (apiBase: string): UseProductDataResult => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [productPrices, setProductPrices] = useState<ProductPricingRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(
    null
  );
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
      const response = await fetch(`${apiBase}${API_ENDPOINTS.PRODUCT_PRICES}`, {
        credentials: "include",
      });
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
      const computedRows = normalizedRows.map((row) =>
        applyBasePriceToProduct(row, row.baseSupplyPrice)
      );
      const initialUpdatedMap = computedRows.reduce<Record<number, string>>(
        (acc, row) => {
          if (row.lastUpdated) {
            acc[row.id] = row.lastUpdated;
          }
          return acc;
        },
        {}
      );
      setProductPrices(computedRows);
      setStatusOverrides({});
      setUpdatedTimestampMap(initialUpdatedMap);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
      setProductPrices([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải dữ liệu pricing."
      );
    } finally {
      setIsLoading(false);
    }
  }, [apiBase]);

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

  const pagedPricing = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredPricing.slice(start, end);
  }, [filteredPricing, currentPage, rowsPerPage]);

  const totalRows = filteredPricing.length;

  return {
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalRows,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    productPrices,
    setProductPrices,
    isLoading,
    setIsLoading,
    error,
    setError,
    statusOverrides,
    setStatusOverrides,
    updatedTimestampMap,
    setUpdatedTimestampMap,
    expandedProductId,
    setExpandedProductId,
    isRefreshing,
    setIsRefreshing,
    fetchProductPrices,
    filteredPricing: pagedPricing,
  };
};

