import { useMemo } from "react";
import type { Supply } from "../types";
import { normalizeText } from "../utils/supplies";

type UseFilteredSuppliesParams = {
  supplies: Supply[];
  searchTerm: string;
  statusFilter: string;
};

export function useFilteredSupplies({
  supplies,
  searchTerm,
  statusFilter,
}: UseFilteredSuppliesParams) {
  return useMemo(() => {
    const term = normalizeText(searchTerm);
    const filtered = supplies.filter((supply) => {
      const matchSearch =
        !term || normalizeText(supply.sourceName).includes(term);
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? supply.isActive : !supply.isActive);
      return matchSearch && matchStatus;
    });

    const getDateValue = (value: string | null) => {
      if (!value) return 0;
      const timestamp = new Date(value).getTime();
      return Number.isFinite(timestamp) ? timestamp : 0;
    };

    return filtered.sort((a, b) => {
      const debtA = Number(a.totalUnpaidImport) || 0;
      const debtB = Number(b.totalUnpaidImport) || 0;
      const positiveA = debtA > 0;
      const positiveB = debtB > 0;
      if (positiveA !== positiveB) return positiveA ? -1 : 1;

      const negativeA = debtA < 0;
      const negativeB = debtB < 0;
      if (negativeA !== negativeB) return negativeA ? -1 : 1;

      if ((positiveA || negativeA) && debtA !== debtB) {
        return debtB - debtA;
      }

      const lastA = getDateValue(a.lastOrderDate);
      const lastB = getDateValue(b.lastOrderDate);
      const hasDateA = lastA > 0;
      const hasDateB = lastB > 0;
      if (hasDateA !== hasDateB) return hasDateA ? -1 : 1;
      if (lastA !== lastB) return lastB - lastA;

      const ordersDiff = (b.totalOrders || 0) - (a.totalOrders || 0);
      if (ordersDiff !== 0) return ordersDiff;

      return a.sourceName.localeCompare(b.sourceName);
    });
  }, [supplies, searchTerm, statusFilter]);
}
