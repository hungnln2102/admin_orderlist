import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../../../lib/api";
import {
  AugmentedRow,
  DEFAULT_CAPACITY_LIMIT,
  DEFAULT_SLOT_CAPACITY_UNIT,
  DEFAULT_SLOT_LIMIT,
  OrderListItem,
  PACKAGE_FIELD_OPTIONS,
  PackageSlotAssignment,
  PackageField,
  PackageRow,
  PackageTemplate,
  SlotLinkMode,
  SlotLinkPreferenceMap,
  StatusFilter,
  NormalizedOrderRecord,
  buildIdentifierKeys,
  buildPackageLinkKeys,
  buildSlotLabelVariants,
  enhancePackageRow,
  extractCapacityUnitsFromOrder,
  getSlotAvailabilityState,
  normalizeIdentifier,
  normalizeMatchKey,
  normalizeProductCodeValue,
  normalizeSlotKey,
  parseNumericValue,
  toCleanString,
  resolveOrderDisplayValue,
  stripCapacityFields,
  readSlotLinkPrefs,
  writeSlotLinkPrefs,
} from "../utils/packageHelpers";
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

const buildOrderLookupKey = (
  record: NormalizedOrderRecord,
  fallbackIndex: number
): string => {
  const base = record.base;
  if (base?.id !== undefined && base?.id !== null) {
    return `id:${base.id}`;
  }
  if (base?.id_order !== undefined && base?.id_order !== null) {
    return `code:${base.id_order}`;
  }
  return `${record.productKey || record.infoKey}-${fallbackIndex}`;
};

const collectOrdersByProductCodes = (
  codes: Set<string>,
  orderMap: Map<string, NormalizedOrderRecord[]>
): NormalizedOrderRecord[] => {
  if (codes.size === 0) return [];
  const collected = new Map<string, NormalizedOrderRecord>();
  codes.forEach((code) => {
    const records = orderMap.get(code);
    if (!records?.length) return;
    records.forEach((record) => {
      const key = buildOrderLookupKey(record, collected.size);
      if (!collected.has(key)) {
        collected.set(key, record);
      }
    });
  });
  return Array.from(collected.values());
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
          map.set(name, { ...existing, fields: strippedFields });
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
      const productKeys = buildIdentifierKeys(order.id_product ?? "");
      const infoKeys = buildIdentifierKeys(order.information_order ?? "");
      return {
        base: order,
        productKey: productKeys.normalized,
        productLettersKey: productKeys.lettersOnly,
        infoKey: infoKeys.normalized,
        infoLettersKey: infoKeys.lettersOnly,
        slotDisplay: toCleanString(order.slot),
        slotKey: normalizeSlotKey(order.slot),
        slotMatchKey: normalizeMatchKey(order.slot),
        informationDisplay: toCleanString(order.information_order),
        informationKey: normalizeSlotKey(order.information_order),
        informationMatchKey: normalizeMatchKey(order.information_order),
        customerDisplay: toCleanString(order.customer as string | null),
        productCodeNormalized: normalizeProductCodeValue(order.id_product),
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
      rows.map((item) => {
        const includeCapacity = Boolean(item.hasCapacityField);
        const slotLimitRaw = parseNumericValue(item.slot);
        const slotLimit =
          slotLimitRaw && slotLimitRaw > 0
            ? Math.floor(slotLimitRaw)
            : DEFAULT_SLOT_LIMIT;
        const slotUsedRaw = parseNumericValue((item as PackageRow).slotUsed);
        const packageCode = normalizeIdentifier(item.package);
        const packageLettersCode = packageCode.replace(/[0-9]/g, "");
        const slotMode = item.slotLinkMode ?? "information";
        const displayColumn =
          slotMode === "information" ? "slot" : "information";
        const matchColumn = displayColumn === "slot" ? "information" : "slot";
        const packageLinkKeys = buildPackageLinkKeys(item);
        const normalizedProductCodes = item.normalizedProductCodes ?? [];
        const productCodeSet =
          normalizedProductCodes.length > 0
            ? new Set(normalizedProductCodes)
            : null;
        const shouldMatchOrders =
          ordersReady &&
          orderMatchers.length > 0 &&
          (productCodeSet?.size || packageCode.length > 0);

        const matchesByProductCodes = (record: NormalizedOrderRecord) => {
          if (!productCodeSet || productCodeSet.size === 0) return false;
          return (
            !!record.productCodeNormalized &&
            productCodeSet.has(record.productCodeNormalized)
          );
        };

        const matchesByPackageName = (record: NormalizedOrderRecord) => {
          if (!packageCode) return false;
          const productMatch =
            (!!record.productKey &&
              (record.productKey.startsWith(packageCode) ||
                record.productKey.includes(packageCode))) ||
            (!!packageLettersCode &&
              !!record.productLettersKey &&
              (record.productLettersKey.startsWith(packageLettersCode) ||
                record.productLettersKey.includes(packageLettersCode)));
          const infoMatch =
            (!!record.infoKey &&
              (record.infoKey.startsWith(packageCode) ||
                record.infoKey.includes(packageCode))) ||
            (!!packageLettersCode &&
              !!record.infoLettersKey &&
              (record.infoLettersKey.startsWith(packageLettersCode) ||
                record.infoLettersKey.includes(packageLettersCode)));
          return productMatch || infoMatch;
        };

        const matchesProductRecord = (record: NormalizedOrderRecord) => {
          return matchesByProductCodes(record) || matchesByPackageName(record);
        };

        const matchesLinkRecord = (record: NormalizedOrderRecord) => {
          if (packageLinkKeys.length === 0) return true;
          const linkValue =
            matchColumn === "slot"
              ? record.slotMatchKey
              : record.informationMatchKey;
          if (!linkValue) return false;
          return packageLinkKeys.some(
            (pkgKey) =>
              pkgKey === linkValue ||
              pkgKey.includes(linkValue) ||
              linkValue.includes(pkgKey)
          );
        };

        const candidateOrders =
          shouldMatchOrders && productCodeSet?.size
            ? collectOrdersByProductCodes(productCodeSet, ordersByProductCode)
            : null;

        const relevantOrders = shouldMatchOrders
          ? (() => {
              const combined = new Map<string, NormalizedOrderRecord>();

              const addOrder = (record: NormalizedOrderRecord) => {
                const key = buildOrderLookupKey(record, combined.size);
                if (!combined.has(key)) {
                  combined.set(key, record);
                }
              };

              candidateOrders?.forEach(addOrder);

              // If price-list product codes don't match order product codes,
              // fall back to matching by package name so seats aren't missed.
              orderMatchers.forEach((record) => {
                if (matchesProductRecord(record)) {
                  addOrder(record);
                }
              });

              return Array.from(combined.values()).filter((record) =>
                matchesLinkRecord(record)
              );
            })()
          : [];

        const seenOrderIds = new Set<string>();
        const slotAssignments: PackageSlotAssignment[] = [];
        if (shouldMatchOrders) {
          relevantOrders.forEach((orderRecord) => {
            const displayValue = resolveOrderDisplayValue(
              orderRecord,
              displayColumn
            );
            const matchValueRaw =
              matchColumn === "slot"
                ? orderRecord.slotDisplay
                : orderRecord.informationDisplay;
            const matchValue =
              matchValueRaw || orderRecord.customerDisplay || "";
            const uniqueKey =
              orderRecord.base?.id !== undefined &&
              orderRecord.base?.id !== null
                ? `id:${orderRecord.base.id}`
                : orderRecord.base?.id_order !== undefined &&
                  orderRecord.base?.id_order !== null
                ? `code:${orderRecord.base.id_order}`
                : `${matchValue}-${slotAssignments.length}`;
            if (seenOrderIds.has(uniqueKey)) return;
            seenOrderIds.add(uniqueKey);
            const label = displayValue || matchValue;
            const labelVariants = buildSlotLabelVariants(
              orderRecord,
              displayColumn,
              label
            );
            if (labelVariants.length === 0) return;
            const capacityUnits = includeCapacity
              ? extractCapacityUnitsFromOrder(packageCode, orderRecord)
              : null;
            labelVariants.forEach((slotLabel) => {
              const resolvedLabel = slotLabel || label || "";
              if (!resolvedLabel) return;
              slotAssignments.push({
                slotLabel: resolvedLabel,
                matchValue: matchValue || resolvedLabel,
                sourceOrderId: orderRecord.base?.id ?? null,
                sourceOrderCode:
                  (orderRecord.base?.id_order as string | number | null) ??
                  null,
                displayColumn,
                matchColumn,
                capacityUnits,
              });
            });
          });
        }

        const slotUsageCount =
          slotAssignments.length > 0
            ? slotAssignments.length
            : slotUsedRaw !== null
            ? Math.max(Math.floor(slotUsedRaw), 0)
            : 0;
        const slotUsed = Math.min(slotUsageCount, slotLimit);
        const remainingSlots = Math.max(slotLimit - slotUsed, 0);

        let capacityLimit = 0;
        let capacityUsed = 0;
        let remainingCapacity = 0;
        if (includeCapacity) {
          const capacityLimitRaw = parseNumericValue(item.capacity);
          capacityLimit =
            capacityLimitRaw && capacityLimitRaw > 0
              ? Math.floor(capacityLimitRaw)
              : DEFAULT_CAPACITY_LIMIT;
          const capacityUsedRaw = parseNumericValue(
            (item as PackageRow).capacityUsed
          );
          const derivedCapacityUnits =
            slotAssignments.length > 0
              ? slotAssignments.reduce(
                  (total, assignment) =>
                    total +
                    (assignment.capacityUnits ?? DEFAULT_SLOT_CAPACITY_UNIT),
                  0
                )
              : slotUsageCount * DEFAULT_SLOT_CAPACITY_UNIT;
          const fallbackCapacityUsed = Math.min(
            derivedCapacityUnits,
            capacityLimit
          );
          capacityUsed = Math.min(
            Math.max(
              capacityUsedRaw !== null
                ? Math.floor(capacityUsedRaw)
                : fallbackCapacityUsed,
              0
            ),
            capacityLimit
          );
          remainingCapacity = Math.max(capacityLimit - capacityUsed, 0);
        }
        const matchedOrders = shouldMatchOrders
          ? relevantOrders.map((entry) => entry.base)
          : [];
        return {
          ...item,
          slotUsed,
          slotLimit,
          remainingSlots,
          capacityLimit,
          capacityUsed,
          remainingCapacity,
          slotAssignments,
          matchedOrders,
          packageCode,
          hasCapacityField: includeCapacity,
          productCodes: item.productCodes ?? [],
          normalizedProductCodes,
          matchModeValue: item.matchModeValue ?? item.match ?? null,
        };
      }),
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
