import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../../../lib/api";
import {
  AugmentedRow,
  OrderListItem,
  PACKAGE_FIELD_OPTIONS,
  PackageField,
  PackageRow,
  PackageTemplate,
  SlotLinkMode,
  SlotLinkPreferenceMap,
  StatusFilter,
  NormalizedOrderRecord,
  buildIdentifierKeys,
  enhancePackageRow,
  getSlotAvailabilityState,
  normalizeMatchKey,
  normalizeProductCodeValue,
  normalizeSlotKey,
  toCleanString,
  stripCapacityFields,
  readSlotLinkPrefs,
  writeSlotLinkPrefs,
} from "../utils/packageHelpers";
import { computeAugmentationForPackage } from "../utils/packageMatchUtils";
import { onRefresh } from "../../../../lib/refreshBus";

type UsePackageDataResult = {
  data: {
    rows: PackageRow[];
    templates: PackageTemplate[];
    computedRows: AugmentedRow[];
    filteredRows: AugmentedRow[];
    sortedRows: AugmentedRow[];
    scopedRows: AugmentedRow[];
    selectedPackage: string | null;
    selectedTemplate: PackageTemplate | null;
    packageSummaries: Array<{
      name: string;
      total: number;
      low: number;
      out: number;
    }>;
    slotStats: {
      total: number;
      low: number;
      out: number;
    };
    showCapacityColumn: boolean;
    tableColumnCount: number;
    loading: boolean;
    packagesLoading: boolean;
    ordersLoading: boolean;
    ordersReady: boolean;
    defaultTemplateFields: PackageField[];
  };
  filters: {
    searchTerm: string;
    categoryFilter: string;
    statusFilter: StatusFilter;
  };
  actions: {
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    setCategoryFilter: React.Dispatch<React.SetStateAction<string>>;
    setStatusFilter: React.Dispatch<React.SetStateAction<StatusFilter>>;
    setRows: React.Dispatch<React.SetStateAction<PackageRow[]>>;
    setTemplates: React.Dispatch<React.SetStateAction<PackageTemplate[]>>;
    persistSlotLinkPreference: (id: number | string, mode: SlotLinkMode) => void;
    applySlotLinkPrefs: (row: PackageRow) => PackageRow;
  };
};

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
  const [slotLinkPrefs, setSlotLinkPrefs] = useState<SlotLinkPreferenceMap>(
    () => readSlotLinkPrefs()
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

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const persistSlotLinkPreference = useCallback(
    (id: number | string, mode: SlotLinkMode) => {
      const key = String(id);
      setSlotLinkPrefs((prev) => {
        if (prev[key] === mode) return prev;
        const next = { ...prev, [key]: mode };
        writeSlotLinkPrefs(next);
        return next;
      });
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setPackagesLoading(true);
        const res = await apiFetch(`/api/package-products`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as PackageRow[];
        if (!cancelled) {
          if (Array.isArray(data)) {
            const normalizedRows = data.map((row) =>
              enhancePackageRow(row, slotLinkPrefsRef.current)
            );
            setRows(normalizedRows);
          } else {
            setRows([]);
          }
        }
      } catch (error) {
        console.error("Tải sản phẩm gói thất bại:", error);
        if (!cancelled) {
          const { handleNetworkError } = await import("@/lib/errorHandler");
          console.error(handleNetworkError(error));
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setPackagesLoading(false);
        }
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
        const res = await apiFetch(`/api/orders`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as OrderListItem[];
        if (!cancelled) {
          if (Array.isArray(data)) {
            setOrders(data);
          } else {
            setOrders([]);
          }
          setOrdersReady(true);
        }
      } catch (error) {
        console.error("Tải danh sách đơn hàng thất bại:", error);
        if (!cancelled) {
          setOrders([]);
          setOrdersReady(false);
        }
      } finally {
        if (!cancelled) {
          setOrdersLoading(false);
        }
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
      const res = await apiFetch(`/api/orders`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as OrderListItem[];
      if (!isMountedRef.current) return;
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([]);
      }
      setOrdersReady(true);
    } catch (error) {
      console.error("Failed to refresh orders for packages:", error);
      if (isMountedRef.current) {
        setOrders([]);
        setOrdersReady(false);
      }
    } finally {
      if (isMountedRef.current) {
        setOrdersLoading(false);
      }
    }
  }, []);

  useEffect(
    () => onRefresh(["orders"], () => void refreshOrders()),
    [refreshOrders]
  );

  const packageNames = useMemo(
    () => Array.from(new Set(rows.map((row) => row.package))).sort(),
    [rows]
  );

  useEffect(() => {
    setTemplates((prev) => {
      const map = new Map(prev.map((tpl) => [tpl.name, tpl]));
      let changed = false;
      packageNames.forEach((name) => {
        if (!name) return;
        const firstRow = rows.find((row) => row.package === name);
        const productId = firstRow?.productId ?? null;
        const hasCapacityConfigured = rows.some(
          (row) => row.package === name && row.hasCapacityField
        );
        const existing = map.get(name);
        if (!existing) {
          const inferredFields = hasCapacityConfigured
            ? defaultTemplateFields
            : stripCapacityFields(defaultTemplateFields);
          map.set(name, {
            name,
            productId,
            fields: inferredFields,
            isCustom: false,
          });
          changed = true;
          return;
        }
        if (
          existing.isCustom !== true &&
          !hasCapacityConfigured &&
          existing.fields.includes("capacity")
        ) {
          const strippedFields = stripCapacityFields(existing.fields);
          map.set(name, { ...existing, productId: existing.productId ?? productId, fields: strippedFields });
          changed = true;
        }
      });
      if (!changed) return prev;
      return Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    });
  }, [packageNames, rows, defaultTemplateFields]);

  const orderMatchers = useMemo<NormalizedOrderRecord[]>(() => {
    return orders.map((order) => {
      const idProduct =
        (order.id_product ?? order.idProduct ?? "") as string;
      const informationOrder =
        (order.information_order ?? order.informationOrder ?? "") as string;
      const slot = order.slot;
      const productKeys = buildIdentifierKeys(idProduct);
      const infoKeys = buildIdentifierKeys(informationOrder);
      return {
        base: order,
        productKey: productKeys.normalized,
        productLettersKey: productKeys.lettersOnly,
        infoKey: infoKeys.normalized,
        infoLettersKey: infoKeys.lettersOnly,
        slotDisplay: toCleanString(slot),
        slotKey: normalizeSlotKey(slot),
        slotMatchKey: normalizeMatchKey(slot),
        informationDisplay: toCleanString(informationOrder),
        informationKey: normalizeSlotKey(informationOrder),
        informationMatchKey: normalizeMatchKey(informationOrder),
        customerDisplay: toCleanString(order.customer as string | null),
        productCodeNormalized: normalizeProductCodeValue(idProduct),
      };
    });
  }, [orders]);

  const ordersByProductCode = useMemo(() => {
    const map = new Map<string, NormalizedOrderRecord[]>();
    orderMatchers.forEach((record) => {
      if (!record.productCodeNormalized) return;
      const key = record.productCodeNormalized;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(record);
    });
    return map;
  }, [orderMatchers]);

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
    [rows, orderMatchers, ordersReady, ordersByProductCode]
  );

  const selectedPackage = categoryFilter !== "all" ? categoryFilter : null;
  const selectedTemplate = useMemo(
    () =>
      selectedPackage
        ? templates.find((tpl) => tpl.name === selectedPackage) ?? null
        : null,
    [templates, selectedPackage]
  );
  const scopedRows = useMemo(
    () =>
      selectedPackage
        ? computedRows.filter((row) => row.package === selectedPackage)
        : computedRows,
    [computedRows, selectedPackage]
  );
  const filteredRows = useMemo(
    () =>
      scopedRows.filter((item) => {
        const term = searchTerm.trim().toLowerCase();
        const infoFields = [
          item.information,
          item.informationUser,
          item.informationMail,
          item.informationPass,
          item.accountUser,
          item.accountMail,
          item.accountPass,
          item.note,
        ];
        const matchesSearch =
          term.length === 0 ||
          infoFields.some((field) => {
            const normalizedValue =
              field === null || field === undefined ? "" : String(field);
            return normalizedValue.toLowerCase().includes(term);
          });
        const matchesCategory =
          categoryFilter === "all" || item.package === categoryFilter;
        const slotState = getSlotAvailabilityState(item.remainingSlots);
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "full" && slotState === "ok") ||
          statusFilter === slotState;
        return matchesSearch && matchesCategory && matchesStatus;
      }),
    [scopedRows, searchTerm, categoryFilter, statusFilter]
  );
  const sortedRows = useMemo(
    () =>
      [...filteredRows].sort((a, b) => {
        const rawA = Number(a.remainingSlots);
        const rawB = Number(b.remainingSlots);
        const slotsA = Number.isFinite(rawA) ? rawA : Number.POSITIVE_INFINITY;
        const slotsB = Number.isFinite(rawB) ? rawB : Number.POSITIVE_INFINITY;
        const normA = slotsA <= 0 ? Number.POSITIVE_INFINITY : slotsA;
        const normB = slotsB <= 0 ? Number.POSITIVE_INFINITY : slotsB;
        if (normA === normB) return 0;
        return normA - normB;
      }),
    [filteredRows]
  );

  const hasCapacityRows = filteredRows.some(
    (row) => row.hasCapacityField ?? false
  );
  const showCapacityColumn =
    hasCapacityRows ||
    (filteredRows.length === 0 &&
      (selectedTemplate?.fields.includes("capacity") ?? false));
  const tableColumnCount = showCapacityColumn ? 9 : 8;

  const slotStats = useMemo(() => {
    const low = scopedRows.reduce(
      (total, row) =>
        getSlotAvailabilityState(row.remainingSlots) === "low"
          ? total + 1
          : total,
      0
    );
    const out = scopedRows.reduce(
      (total, row) =>
        getSlotAvailabilityState(row.remainingSlots) === "out"
          ? total + 1
          : total,
      0
    );
    return {
      total: scopedRows.length,
      low,
      out,
    };
  }, [scopedRows]);

  const allPackageNames = useMemo(() => {
    const names = new Set<string>();
    computedRows.forEach((row) => {
      const trimmed = (row.package || "").trim();
      if (trimmed) names.add(trimmed);
    });
    templates.forEach((tpl) => {
      if (tpl.name) names.add(tpl.name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [computedRows, templates]);

  const packageSummaries = useMemo(() => {
    const stats = new Map<
      string,
      { total: number; low: number; out: number }
    >();
    allPackageNames.forEach((name) =>
      stats.set(name, { total: 0, low: 0, out: 0 })
    );
    computedRows.forEach((row) => {
      const key = (row.package || "").trim();
      if (!key) return;
      const entry = stats.get(key);
      if (!entry) return;
      entry.total += 1;
      const availability = getSlotAvailabilityState(row.remainingSlots);
      if (availability === "low") entry.low += 1;
      if (availability === "out") entry.out += 1;
    });
    return allPackageNames.map((name) => ({
      name,
      ...(stats.get(name) ?? { total: 0, low: 0, out: 0 }),
    }));
  }, [allPackageNames, computedRows]);

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
