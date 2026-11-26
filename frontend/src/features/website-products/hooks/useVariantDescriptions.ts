import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_VARIANT_PAGE_SIZE,
  listVariants,
} from "../websiteProductsApi";
import type {
  EditorialStatusFilter,
  VariantCounts,
  VariantStatusFilter,
  WebsiteVariant,
} from "../types";

export function useVariantDescriptions() {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState<{
    page: number;
    limit: number;
    search: string;
    status: VariantStatusFilter;
    editorialStatus: EditorialStatusFilter;
    category: string;
    revision: number;
  }>({
    page: 1,
    limit: DEFAULT_VARIANT_PAGE_SIZE,
    search: "",
    status: "all",
    editorialStatus: "all",
    category: "",
    revision: 0,
  });

  const [variants, setVariants] = useState<WebsiteVariant[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState<VariantCounts>({
    total: 0,
    active: 0,
    inactive: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [knownCategories, setKnownCategories] = useState<string[]>([]);

  const [editing, setEditing] = useState<WebsiteVariant | null>(null);

  // Debounce tìm kiếm 350ms để người dùng gõ mượt mà không cần bấm nút liên tục
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === query.search) return;
    const timer = window.setTimeout(() => {
      setQuery((prev) => ({
        ...prev,
        page: 1,
        search: trimmed,
      }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, query.search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    listVariants(
      {
        page: query.page,
        limit: query.limit,
        search: query.search,
        status: query.status,
        editorialStatus: query.editorialStatus,
        category: query.category,
      },
      controller.signal
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        setVariants(result.data ?? []);
        const incomingCategories = (result.data ?? []).map(({ category }) => category).filter(Boolean);
        setKnownCategories((previous) => [...new Set([...previous, ...incomingCategories])]);
        setTotalItems(result.pagination?.total ?? 0);
        setTotalPages(result.pagination?.totalPages ?? 1);
        if (result.counts) {
          setCounts(result.counts);
        }
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [query]);

  const submitSearchImmediate = useCallback(() => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      search: searchInput.trim(),
      revision: prev.revision + 1,
    }));
  }, [searchInput]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setQuery((prev) => ({
      ...prev,
      page: 1,
      search: "",
    }));
  }, []);

  const setStatusFilter = useCallback((status: VariantStatusFilter) => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      status,
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  }, []);

  const setEditorialStatus = useCallback((editorialStatus: EditorialStatusFilter) => {
    setQuery((prev) => ({ ...prev, editorialStatus, page: 1 }));
  }, []);

  const setCategory = useCallback((category: string) => {
    setQuery((prev) => ({ ...prev, category, page: 1 }));
  }, []);

  const setPageSize = useCallback((limit: number) => {
    setQuery((prev) => ({ ...prev, page: 1, limit }));
  }, []);

  const refresh = useCallback(() => {
    setQuery((prev) => ({ ...prev, revision: prev.revision + 1 }));
  }, []);

  const openEditor = useCallback((variant: WebsiteVariant) => {
    setEditing(variant);
  }, []);

  const closeEditor = useCallback(() => {
    setEditing(null);
    refresh();
  }, [refresh]);

  return {
    searchInput,
    setSearchInput,
    activeSearch: query.search,
    statusFilter: query.status,
    setStatusFilter,
    editorialStatus: query.editorialStatus,
    setEditorialStatus,
    category: query.category,
    setCategory,
    knownCategories,
    page: query.page,
    pageSize: query.limit,
    totalItems,
    totalPages,
    counts,
    variants,
    loading,
    error,
    editing,
    submitSearchImmediate,
    clearSearch,
    setPage,
    setPageSize,
    refresh,
    openEditor,
    closeEditor,
  };
}
