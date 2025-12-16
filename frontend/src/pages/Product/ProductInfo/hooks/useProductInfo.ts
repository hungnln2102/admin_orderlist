import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../../lib/api";
import {
  fetchProductDescriptions,
  ProductDescription,
} from "../../../../lib/productDescApi";
import { normalizeErrorMessage } from "../../../../lib/textUtils";
import {
  MergedProduct,
  PAGE_SIZE,
  ProductPriceItem,
  mergeProducts,
} from "../utils/productInfoHelpers";

type UseProductInfoResult = {
  data: {
    mergedProducts: MergedProduct[];
    pagedProducts: MergedProduct[];
    loading: boolean;
    error: string | null;
    currentPage: number;
    totalPages: number;
    expandedId: number | null;
    searchTerm: string;
  };
  actions: {
    handleSearchChange: (value: string) => void;
    setCurrentPage: (page: number) => void;
    setExpandedId: (id: number | null) => void;
    reload: () => Promise<void>;
    setProductDescs: React.Dispatch<
      React.SetStateAction<ProductDescription[]>
    >;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
  };
};

export const useProductInfo = (): UseProductInfoResult => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [productDescs, setProductDescs] = useState<ProductDescription[]>([]);
  const [productPriceList, setProductPriceList] = useState<ProductPriceItem[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mergedProducts: MergedProduct[] = useMemo(
    () => mergeProducts(productDescs, productPriceList, searchTerm),
    [productDescs, productPriceList, searchTerm]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(mergedProducts.length / PAGE_SIZE)),
    [mergedProducts.length]
  );

  const pagedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return mergedProducts.slice(start, end);
  }, [mergedProducts, currentPage]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [descResponse, priceResponse] = await Promise.all([
        fetchProductDescriptions({}),
        apiFetch("/api/products"),
      ]);
      const priceData = (await priceResponse.json().catch(() => [])) as
        | ProductPriceItem[]
        | [];
      setProductDescs(
        Array.isArray(descResponse.items) ? descResponse.items : []
      );
      setProductPriceList(Array.isArray(priceData) ? priceData : []);
    } catch (err) {
      setProductDescs([]);
      setProductPriceList([]);
      setError(
        normalizeErrorMessage(
          err instanceof Error ? err.message : String(err ?? ""),
          { fallback: "KhA'ng th ¯Ÿ t §œi danh sA­ch s §œn ph §cm." }
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return {
    data: {
      mergedProducts,
      pagedProducts,
      loading,
      error,
      currentPage,
      totalPages,
      expandedId,
      searchTerm,
    },
    actions: {
      handleSearchChange,
      setCurrentPage,
      setExpandedId,
      reload: loadProducts,
      setProductDescs,
      setError,
    },
  };
};
