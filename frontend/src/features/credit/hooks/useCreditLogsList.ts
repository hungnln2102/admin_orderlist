import { useEffect, useMemo, useState } from "react";
import type { CreditSortOption, CreditStatusGroup } from "../types";

const DEFAULT_LIMIT = 20;

export function useCreditLogsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusGroup, setStatusGroup] = useState<CreditStatusGroup>("all");
  const [sort, setSort] = useState<CreditSortOption>("issued_at_desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, statusGroup, sort, limit]);

  const queryParams = useMemo(
    () => ({
      q: debouncedSearchTerm,
      statusGroup,
      sort,
      page,
      limit,
    }),
    [debouncedSearchTerm, statusGroup, sort, page, limit]
  );

  return {
    searchTerm,
    setSearchTerm,
    statusGroup,
    setStatusGroup,
    sort,
    setSort,
    page,
    setPage,
    limit,
    setLimit,
    queryParams,
  };
}
