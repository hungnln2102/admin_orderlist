import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

type PageUpdate = number | ((currentPage: number) => number);

const parsePage = (value: string | null) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

export function useUrlPagination(totalPages = 1) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = useMemo(() => parsePage(searchParams.get("page")), [searchParams]);
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const page = Math.min(requestedPage, safeTotalPages);

  const updatePage = useCallback((nextPage: number, replace = false) => {
    const params = new URLSearchParams(searchParams);
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    setSearchParams(params, { replace });
  }, [searchParams, setSearchParams]);

  const setPage = useCallback((update: PageUpdate) => {
    const resolved = typeof update === "function" ? update(page) : update;
    updatePage(Math.max(1, Math.min(safeTotalPages, Math.trunc(Number(resolved) || 1))));
  }, [page, safeTotalPages, updatePage]);

  const resetPage = useCallback(() => updatePage(1, true), [updatePage]);

  useEffect(() => {
    if (requestedPage !== page) updatePage(page, true);
  }, [page, requestedPage, updatePage]);

  return { page, setPage, resetPage };
}