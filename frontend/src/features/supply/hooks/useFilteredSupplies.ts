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
      const payableA = Number(
        a.payableToSupplier ?? Math.max(0, Number(a.totalUnpaidImport) || 0)
      );
      const payableB = Number(
        b.payableToSupplier ?? Math.max(0, Number(b.totalUnpaidImport) || 0)
      );
      if (payableA !== payableB) {
        return payableB - payableA;
      }

      const refundA = Number(
        a.supplierRefundToShop ?? Math.max(0, -(Number(a.totalUnpaidImport) || 0))
      );
      const refundB = Number(
        b.supplierRefundToShop ?? Math.max(0, -(Number(b.totalUnpaidImport) || 0))
      );
      if (refundA !== refundB) {
        return refundB - refundA;
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
