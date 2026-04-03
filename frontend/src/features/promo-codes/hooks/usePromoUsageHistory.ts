import { useMemo, useState } from "react";
import { MOCK_PROMO_USAGE } from "../constants";

const PAGE_SIZE = 10;

export function usePromoUsageHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredItems = useMemo(() => {
    let list = MOCK_PROMO_USAGE;

    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.promoCode.toLowerCase().includes(query) ||
          item.account.toLowerCase().includes(query) ||
          (item.orderCode?.toLowerCase().includes(query) ?? false) ||
          item.discountAmount.toLowerCase().includes(query) ||
          item.usedAt.toLowerCase().includes(query)
      );
    }

    return list;
  }, [searchTerm]);

  const start = (currentPage - 1) * PAGE_SIZE;
  const currentRows = filteredItems.slice(start, start + PAGE_SIZE);

  return {
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    totalItems: filteredItems.length,
    start,
    currentRows,
    pageSize: PAGE_SIZE,
  };
}
