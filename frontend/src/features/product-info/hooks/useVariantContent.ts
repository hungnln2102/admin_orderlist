import { useCallback, useEffect, useState } from "react";
import {
  fetchProductDescriptions,
  ProductDescription,
} from "@/lib/productDescApi";
import { PAGE_SIZE } from "../utils/productInfoHelpers";

type UseVariantContentParams = {
  searchTerm: string;
  active: boolean;
};

export const useVariantContent = ({
  searchTerm,
  active,
}: UseVariantContentParams) => {
  const [items, setItems] = useState<ProductDescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const loadNow = useCallback(async () => {
    const offset = (currentPage - 1) * PAGE_SIZE;
    const res = await fetchProductDescriptions({
      search: debouncedSearch.trim() || undefined,
      limit: PAGE_SIZE,
      offset,
      scope: "desc_variant",
    });
    return res;
  }, [debouncedSearch, currentPage]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await loadNow();
        if (cancelled) return;
        setItems(res.items);
        setTotal(
          typeof res.total === "number" && res.total >= 0
            ? res.total
            : res.count
        );
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Không tải được dữ liệu."
          );
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [active, loadNow]);

  const reload = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError(null);
    try {
      const res = await loadNow();
      setItems(res.items);
      setTotal(
        typeof res.total === "number" && res.total >= 0
          ? res.total
          : res.count
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không tải được dữ liệu."
      );
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [active, loadNow]);

  return {
    items,
    loading,
    error,
    total,
    currentPage,
    setCurrentPage,
    reload,
  };
};
