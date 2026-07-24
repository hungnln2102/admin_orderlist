import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/shared/api/client";
import type { OrderListItem, PackageRow } from "@/features/package-product/utils/packageHelpers";
import { ExpenseAllocationTableView } from "./expense-cost-allocation-table/ExpenseAllocationTableView";
import {
  DATE_COLUMN_WIDTH,
  MONTH_COLUMN_WIDTH,
  buildDateColumns,
  buildMonthColumns,
  computeExpenseRows,
  computeFixedPrefixMergeRowSpans,
  type ExpenseFormRow,
  type OrderListRow,
  type ViewMode,
} from "./expense-cost-allocation-table/helpers";

export const ExpenseCostAllocationTable: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<ExpenseFormRow[]>([]);

  const dayColumns = useMemo(() => buildDateColumns(), []);
  const monthColumns = useMemo(() => buildMonthColumns(), []);
  const periodColumns = viewMode === "day" ? dayColumns : monthColumns;

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [importOrdersRes, packagesRes, packageOrdersRes] = await Promise.all([
        apiFetch("/api/finance/allocations?scope=mavn_paid"),
        apiFetch("/api/package-products"),
        apiFetch("/api/orders?scope=package_match"),
      ]);

      if (!importOrdersRes.ok || !packagesRes.ok || !packageOrdersRes.ok) {
        const failed = !importOrdersRes.ok
          ? importOrdersRes
          : !packagesRes.ok
            ? packagesRes
            : packageOrdersRes;
        const err = (await failed.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          err.error || failed.statusText || "Không thể tải dữ liệu chi phí.",
        );
      }

      const [importOrdersData, packagesData, packageOrdersData] = await Promise.all([
        importOrdersRes.json(),
        packagesRes.json(),
        packageOrdersRes.json(),
      ]);

      const importRows = (
        Array.isArray(importOrdersData) ? importOrdersData : []
      ) as OrderListRow[];
      const packageRows = (Array.isArray(packagesData) ? packagesData : []) as PackageRow[];
      const packageOrders = (
        Array.isArray(packageOrdersData) ? packageOrdersData : []
      ) as OrderListItem[];

      setOrders(computeExpenseRows(importRows, packageRows, packageOrders));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const periodColumnWidth = viewMode === "day" ? DATE_COLUMN_WIDTH : MONTH_COLUMN_WIDTH;
  const yearLabel = useMemo(() => {
    const years = Array.from(new Set(periodColumns.map((column) => column.year)));
    return years.length > 0 ? years.join(" - ") : "2026";
  }, [periodColumns]);
  const columnKeys = periodColumns.map((column) => column.key).join("|");
  const fixedDisplayRows = useMemo(() => orders.slice(0, 120), [orders]);
  const fixedPrefixMergeRowSpans = useMemo(
    () => computeFixedPrefixMergeRowSpans(fixedDisplayRows),
    [fixedDisplayRows],
  );

  return (
    <ExpenseAllocationTableView
      viewMode={viewMode}
      loading={loading}
      error={error}
      periodColumns={periodColumns}
      periodColumnWidth={periodColumnWidth}
      yearLabel={yearLabel}
      columnKeys={columnKeys}
      fixedDisplayRows={fixedDisplayRows}
      fixedPrefixMergeRowSpans={fixedPrefixMergeRowSpans}
      onReload={() => void loadRows()}
      onToggleViewMode={() =>
        setViewMode((prev) => (prev === "day" ? "month" : "day"))
      }
    />
  );
};
