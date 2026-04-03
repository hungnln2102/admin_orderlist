import { useEffect, useMemo, useState } from "react";
import type { PromoCodeItem, PromoStatus } from "../types";
import { fetchPromotionCodes, mapPromotionCodeToItem } from "@/lib/promotionCodesApi";

const PAGE_SIZE = 10;

export function usePromoCodeList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PromoStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState<PromoCodeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const rows = await fetchPromotionCodes();
        if (!cancelled) {
          setItems(rows.map(mapPromotionCodeToItem));
        }
      } catch {
        if (!cancelled) {
          setError("Không thể tải danh sách mã khuyến mãi");
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    let list = items;

    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.code.toLowerCase().includes(query) ||
          item.discount.toLowerCase().includes(query) ||
          item.condition.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((item) => item.status === statusFilter);
    }

    return list;
  }, [items, searchTerm, statusFilter]);

  const totalItems = filteredItems.length;
  const start = (currentPage - 1) * PAGE_SIZE;
  const currentRows = filteredItems.slice(start, start + PAGE_SIZE);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    items,
    loading,
    error,
    totalItems,
    start,
    currentRows,
    pageSize: PAGE_SIZE,
  };
}
