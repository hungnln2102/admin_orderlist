import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/shared/api/client";
import { onRefresh } from "@/lib/refreshBus";
import {
  PACKAGE_FIELD_OPTIONS,
  type AugmentedRow,
  type OrderListItem,
  type PackageRow,
  type PackageTemplate,
  type SlotLinkMode,
  type SlotLinkPreferenceMap,
  type StatusFilter,
  enhancePackageRow,
  readSlotLinkPrefs,
  writeSlotLinkPrefs,
} from "../utils/packageHelpers";
import { computeAugmentationForPackage } from "../utils/packageMatchUtils";
import { groupOrdersByProductCode, toNormalizedOrderMatchers } from "./use-package-data/orderMatchers";
import {
  computePackageSummaries,
  computeSlotStats,
  filterRows,
  getTableColumnCount,
  sortRowsByRemainingSlots,
} from "./use-package-data/rowTransforms";
import { syncTemplatesFromRows } from "./use-package-data/templateSync";
import type { UsePackageDataResult } from "./use-package-data/types";

export const usePackageData = (): UsePackageDataResult => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersReady, setOrdersReady] = useState(false);
  const [slotLinkPrefs, setSlotLinkPrefs] = useState<SlotLinkPreferenceMap>(() =>
    readSlotLinkPrefs()
  );
  const slotLinkPrefsRef = useRef(slotLinkPrefs);
  const isMountedRef = useRef(true);
  const defaultTemplateFields = useMemo(
    () => PACKAGE_FIELD_OPTIONS.map((opt) => opt.value),
    []
  );

  useEffect(() => {
    slotLinkPrefsRef.current = slotLinkPrefs;
  }, [slotLinkPrefs]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  const persistSlotLinkPreference = useCallback((id: number | string, mode: SlotLinkMode) => {
    const key = String(id);
    setSlotLinkPrefs((prev) => {
      if (prev[key] === mode) return prev;
      const next = { ...prev, [key]: mode };
      writeSlotLinkPrefs(next);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setPackagesLoading(true);
        const res = await apiFetch("/api/package-products");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as PackageRow[];
        if (cancelled) return;
        setRows(
          Array.isArray(data)
            ? data.map((row) => enhancePackageRow(row, slotLinkPrefsRef.current))
            : []
        );
      } catch (error) {
        console.error("Tải sản phẩm gói thất bại:", error);
        if (!cancelled) {
          const { handleNetworkError } = await import("@/lib/errorHandler");
          console.error(handleNetworkError(error));
          setRows([]);
        }
      } finally {
        if (!cancelled) setPackagesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setOrdersLoading(true);
        setOrdersReady(false);
        const res = await apiFetch("/api/orders?scope=package_match");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as OrderListItem[];
        if (cancelled) return;
        setOrders(Array.isArray(data) ? data : []);
        setOrdersReady(true);
      } catch (error) {
        console.error("Tải danh sách đơn hàng thất bại:", error);
        if (!cancelled) {
          setOrders([]);
          setOrdersReady(false);
        }
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshOrders = useCallback(async () => {
    if (!isMountedRef.current) return;
    setOrdersLoading(true);
    setOrdersReady(false);
    try {
      const res = await apiFetch("/api/orders?scope=package_match");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as OrderListItem[];
      if (!isMountedRef.current) return;
      setOrders(Array.isArray(data) ? data : []);
      setOrdersReady(true);
    } catch (error) {
      console.error("Failed to refresh orders for packages:", error);
      if (isMountedRef.current) {
        setOrders([]);
        setOrdersReady(false);
      }
    } finally {
      if (isMountedRef.current) setOrdersLoading(false);
    }
  }, []);

  useEffect(() => onRefresh(["orders"], () => void refreshOrders()), [refreshOrders]);

  const packageNames = useMemo(
    () => Array.from(new Set(rows.map((row) => row.package))).sort(),
    [rows]
  );

  useEffect(() => {
    setTemplates((prev) =>
      syncTemplatesFromRows(prev, packageNames, rows, defaultTemplateFields)
    );
  }, [defaultTemplateFields, packageNames, rows]);

  const orderMatchers = useMemo(() => toNormalizedOrderMatchers(orders), [orders]);
  const ordersByProductCode = useMemo(
    () => groupOrdersByProductCode(orderMatchers),
    [orderMatchers]
  );

  const computedRows: AugmentedRow[] = useMemo(
    () =>
      rows.map((item) => ({
        ...item,
        ...computeAugmentationForPackage({
          item,
          orderMatchers,
          ordersByProductCode,
          ordersReady,
        }),
      })),
    [orderMatchers, ordersByProductCode, ordersReady, rows]
  );

  const selectedPackage = categoryFilter !== "all" ? categoryFilter : null;
  const selectedTemplate = useMemo(
    () => (selectedPackage ? templates.find((tpl) => tpl.name === selectedPackage) ?? null : null),
    [selectedPackage, templates]
  );
  const scopedRows = useMemo(
    () => (selectedPackage ? computedRows.filter((row) => row.package === selectedPackage) : computedRows),
    [computedRows, selectedPackage]
  );
  const filteredRows = useMemo(
    () => filterRows(scopedRows, searchTerm, categoryFilter, statusFilter),
    [categoryFilter, scopedRows, searchTerm, statusFilter]
  );
  const sortedRows = useMemo(() => sortRowsByRemainingSlots(filteredRows), [filteredRows]);
  const { showCapacityColumn, tableColumnCount } = useMemo(
    () => getTableColumnCount(filteredRows, selectedTemplate),
    [filteredRows, selectedTemplate]
  );
  const slotStats = useMemo(() => computeSlotStats(filteredRows), [filteredRows]);
  const packageSummaries = useMemo(
    () => computePackageSummaries(computedRows, templates),
    [computedRows, templates]
  );

  const applySlotLinkPrefs = useCallback(
    (row: PackageRow) => enhancePackageRow(row, slotLinkPrefsRef.current),
    []
  );

  return {
    data: {
      rows,
      templates,
      computedRows,
      filteredRows,
      sortedRows,
      scopedRows,
      selectedPackage,
      selectedTemplate,
      packageSummaries,
      slotStats,
      showCapacityColumn,
      tableColumnCount,
      loading: packagesLoading || ordersLoading,
      packagesLoading,
      ordersLoading,
      ordersReady,
      defaultTemplateFields,
    },
    filters: {
      searchTerm,
      categoryFilter,
      statusFilter,
    },
    actions: {
      setSearchTerm,
      setCategoryFilter,
      setStatusFilter,
      setRows,
      setTemplates,
      persistSlotLinkPreference,
      applySlotLinkPrefs,
    },
  };
};
