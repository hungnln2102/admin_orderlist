import { useCallback, useEffect, useRef, useState } from "react";
import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/shared/api/client";
import type {
  CreditLogsResponse,
  CreditSortOption,
  CreditStatusGroup,
} from "../types";

type FetchParams = {
  q: string;
  statusGroup: CreditStatusGroup;
  sort: CreditSortOption;
  page: number;
  limit: number;
};

const EMPTY_PAYLOAD: CreditLogsResponse = {
  items: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
  },
  filters: {
    q: "",
    status_group: "all",
    sort: "issued_at_desc",
  },
  stats: {
    total_count: 0,
    available_count: 0,
    applied_count: 0,
    unavailable_count: 0,
  },
};

const buildQuery = ({ q, statusGroup, sort, page, limit }: FetchParams) => {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  params.set("status_group", statusGroup);
  params.set("sort", sort);
  params.set("page", String(page));
  params.set("limit", String(limit));
  return params.toString();
};

export function useCreditLogsFetch(params: FetchParams) {
  const [data, setData] = useState<CreditLogsResponse>(EMPTY_PAYLOAD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchCreditLogs = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const query = buildQuery(params);
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`${API_ENDPOINTS.CREDIT_LOGS}?${query}`, {
        signal: abortController.signal,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(body?.error || "Không thể tải credit logs."));
      }
      const payload = body as Partial<CreditLogsResponse>;
      if (requestIdRef.current !== requestId) return;
      setData({
        ...EMPTY_PAYLOAD,
        ...payload,
        items: Array.isArray(payload?.items) ? payload.items : [],
        pagination: {
          ...EMPTY_PAYLOAD.pagination,
          ...(payload?.pagination || {}),
        },
        stats: {
          ...EMPTY_PAYLOAD.stats,
          ...(payload?.stats || {}),
        },
        filters: {
          ...EMPTY_PAYLOAD.filters,
          ...(payload?.filters || {}),
        },
      });
    } catch (fetchError) {
      if (abortController.signal.aborted) return;
      if (requestIdRef.current !== requestId) return;
      setError(fetchError instanceof Error ? fetchError.message : "Không thể tải credit logs.");
      setData(EMPTY_PAYLOAD);
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
        abortControllerRef.current = null;
      }
    }
  }, [params]);

  useEffect(() => {
    fetchCreditLogs();
  }, [fetchCreditLogs]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    },
    []
  );

  return {
    data,
    loading,
    error,
    reload: fetchCreditLogs,
  };
}
