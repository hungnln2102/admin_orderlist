import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import GradientButton from "../components/GradientButton";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  BoltIcon,
  PencilIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import StatCard, { STAT_CARD_ACCENTS } from "../components/StatCard";

const SUMMARY_CARD_ACCENTS = [
  {
    border: "border-sky-100/70",
    glow: "from-sky-100/80 via-white/80 to-blue-100/70",
    link: "text-sky-600 hover:text-sky-700",
  },
  {
    border: "border-emerald-100/70",
    glow: "from-emerald-100/80 via-white/80 to-lime-100/70",
    link: "text-emerald-600 hover:text-emerald-700",
  },
  {
    border: "border-violet-100/70",
    glow: "from-violet-100/80 via-white/80 to-fuchsia-100/70",
    link: "text-violet-600 hover:text-violet-700",
  },
  {
    border: "border-amber-100/70",
    glow: "from-amber-100/80 via-white/80 to-orange-100/70",
    link: "text-amber-600 hover:text-amber-700",
  },
] as const;
type PackageField =
  | "information"
  | "note"
  | "supplier"
  | "import"
  | "expired"
  | "capacity";
type SlotLinkMode = "information" | "slot";
type PackageRow = {
  id: number;
  package: string;
  information: string | null;
  informationUser?: string | null;
  informationPass?: string | null;
  informationMail?: string | null;
  note: string | null;
  accountStorageId?: number | null;
  accountUser?: string | null;
  accountPass?: string | null;
  accountMail?: string | null;
  accountNote?: string | null;
  supplier: string | null;
  import: number | string | null;
  expired: string | null;
  capacity?: string | number | null;
  capacityUsed?: string | number | null;
  slot?: string | number | null;
  slotUsed?: string | number | null;
  slotLinkMode?: SlotLinkMode;
  hasCapacityField?: boolean;
};
type OrderListItem = {
  id?: number | string | null;
  id_don_hang?: string | number | null;
  san_pham?: string | null;
  thong_tin_san_pham?: string | null;
  slot?: string | null;
  khach_hang?: string | null;
  [key: string]: unknown;
};
type PackageSlotAssignment = {
  slotLabel: string;
  matchValue?: string | null;
  sourceOrderId?: number | string | null;
  sourceOrderCode?: string | number | null;
  displayColumn: "slot" | "information";
  matchColumn: "slot" | "information";
  capacityUnits?: number | null;
};
type AugmentedRow = PackageRow & {
  slotUsed: number;
  slotLimit: number;
  remainingSlots: number;
  capacityLimit: number;
  capacityUsed: number;
  remainingCapacity: number;
  slotAssignments: PackageSlotAssignment[];
  matchedOrders: OrderListItem[];
  packageCode: string;
  hasCapacityField: boolean;
};
type NormalizedOrderRecord = {
  base: OrderListItem;
  productKey: string;
  productLettersKey: string;
  infoKey: string;
  infoLettersKey: string;
  slotDisplay: string;
  slotKey: string;
  slotMatchKey: string;
  informationDisplay: string;
  informationKey: string;
  informationMatchKey: string;
  customerDisplay: string;
};
type PackageTemplate = {
  name: string;
  fields: PackageField[];
  isCustom?: boolean;
};
type PackageFormValues = {
  informationUser: string;
  informationPass: string;
  informationMail: string;
  note: string;
  accountUser: string;
  accountPass: string;
  accountMail: string;
  accountNote: string;
  supplier: string;
  import: string;
  expired: string;
  capacity: string;
  slot: string;
  slotLinkMode: SlotLinkMode;
  hasCapacity: boolean;
};
type EditContext = {
  rowId: number;
  template: PackageTemplate;
  initialValues: PackageFormValues;
  accountStorageId: number | null;
};
const EMPTY_FORM_VALUES: PackageFormValues = {
  informationUser: "",
  informationPass: "",
  informationMail: "",
  note: "",
  accountUser: "",
  accountPass: "",
  accountMail: "",
  accountNote: "",
  supplier: "",
  import: "",
  expired: "",
  capacity: "",
  slot: "",
  slotLinkMode: "information",
  hasCapacity: false,
};
const PACKAGE_FIELD_OPTIONS: Array<{ value: PackageField; label: string }> = [
  { value: "information", label: "Package information" },
  { value: "note", label: "Note" },
  { value: "supplier", label: "Supplier" },
  { value: "import", label: "Import price (VND)" },
  { value: "expired", label: "Expired date" },
  { value: "capacity", label: "Total capacity (slots)" },
];
const stripCapacityFields = (fields: PackageField[]): PackageField[] =>
  fields.filter((field) => field !== "capacity");
const DEFAULT_SLOT_LIMIT = 5;
const DEFAULT_CAPACITY_LIMIT = 2000;
const DEFAULT_SLOT_CAPACITY_UNIT = 100;
const LOW_THRESHOLD_RATIO = 0.2;
const LOW_SLOT_THRESHOLD = 2;
type AvailabilityState = "ok" | "low" | "out";
const getCapacityAvailabilityState = (
  remaining: number,
  limit: number
): AvailabilityState => {
  if (limit <= 0) return "out";
  if (remaining <= 0) return "out";
  const ratio = remaining / limit;
  return ratio <= LOW_THRESHOLD_RATIO ? "low" : "ok";
};
const getSlotAvailabilityState = (remaining: number): AvailabilityState => {
  if (remaining <= 0) return "out";
  if (remaining < LOW_SLOT_THRESHOLD) return "low";
  return "ok";
};
const normalizeIdentifier = (value: string | null | undefined): string => {
  return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
};
const buildIdentifierKeys = (value: string | null | undefined) => {
  const normalized = normalizeIdentifier(value);
  return {
    normalized,
    lettersOnly: normalized.replace(/[0-9]/g, ""),
  };
};
const toCleanString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : String(value);
  return str.trim();
};
const formatDisplayDate = (value?: string | null): string => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  const slashMatch = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
  if (slashMatch) {
    return `${slashMatch[3]}/${slashMatch[2]}/${slashMatch[1]}`;
  }
  const dmyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[1]}/${dmyMatch[2]}/${dmyMatch[3]}`;
  }
  return trimmed;
};
const normalizeSlotKey = (value: unknown): string => {
  const cleaned = toCleanString(value);
  return cleaned ? cleaned.replace(/\s+/g, " ").trim().toLowerCase() : "";
};
const normalizeMatchKey = (value: string | null | undefined): string => {
  const trimmed = toCleanString(value);
  return trimmed ? trimmed.toLowerCase().replace(/\s+/g, "") : "";
};
const extractInfoTokens = (value: string | null | undefined): string[] => {
  if (!value) return [];
  return value
    .split(/[|,]/)
    .map((segment) => {
      const trimmed = toCleanString(segment);
      if (!trimmed) return "";
      const parts = trimmed.split(":");
      return toCleanString(
        parts.length > 1 ? parts.slice(1).join(":") : trimmed
      );
    })
    .filter(Boolean);
};
const buildPackageLinkKeys = (row: PackageRow): string[] => {
  const directCandidates: string[] = [
    row.informationUser ?? "",
    row.informationMail ?? "",
    row.informationPass ?? "",
    row.accountUser ?? "",
    row.accountMail ?? "",
    row.accountPass ?? "",
  ]
    .map(toCleanString)
    .filter(Boolean);
  const summaryCandidates = extractInfoTokens(row.information);
  const noteCandidates = extractInfoTokens(row.note);
  const accountNoteCandidates = extractInfoTokens(row.accountNote);
  const combined = [
    ...directCandidates,
    ...summaryCandidates,
    ...noteCandidates,
    ...accountNoteCandidates,
  ];
  return Array.from(
    new Set(
      combined.map((candidate) => normalizeMatchKey(candidate)).filter(Boolean)
    )
  );
};
const resolveOrderDisplayValue = (
  record: NormalizedOrderRecord,
  column: "slot" | "information"
): string => {
  if (column === "slot") {
    return (
      record.slotDisplay ||
      record.customerDisplay ||
      record.informationDisplay ||
      ""
    );
  }
  return (
    record.informationDisplay ||
    record.customerDisplay ||
    record.slotDisplay ||
    ""
  );
};
const buildSlotLabelVariants = (
  record: NormalizedOrderRecord,
  displayColumn: "slot" | "information",
  fallbackLabel: string
): string[] => {
  const cleanedFallback = toCleanString(fallbackLabel);
  if (displayColumn !== "slot") {
    return cleanedFallback ? [cleanedFallback] : [];
  }
  const rawSlotText = record.slotDisplay ?? "";
  const slotPieces = rawSlotText
    .split("|")
    .map((piece) => toCleanString(piece))
    .filter(Boolean);
  if (slotPieces.length >= 1) {
    return slotPieces;
  }
  const customerLabel = toCleanString(record.customerDisplay);
  if (customerLabel) {
    return [customerLabel, `${customerLabel} (2)`];
  }
  return cleanedFallback ? [cleanedFallback] : [];
};
const extractDigitsValue = (text: string | null | undefined): number | null => {
  if (!text) return null;
  const match = text.match(/(\d{2,4})/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};
const extractCapacityUnitsFromOrder = (
  packageCode: string,
  record: NormalizedOrderRecord
): number | null => {
  const normalizedProduct = record.productKey;
  let remainder = normalizedProduct;
  if (packageCode) {
    const idx = remainder.indexOf(packageCode);
    if (idx >= 0) {
      remainder = remainder.slice(idx + packageCode.length);
    }
  }
  const normalizedValue = extractDigitsValue(remainder);
  if (normalizedValue) return normalizedValue;
  const fallbackNormalized = normalizeIdentifier(record.base?.san_pham ?? "");
  return extractDigitsValue(fallbackNormalized);
};
const formatCapacityLabel = (units?: number | null): string => {
  const value =
    units && Number.isFinite(units) && units > 0
      ? Math.round(units)
      : DEFAULT_SLOT_CAPACITY_UNIT;
  return `${value} GB`;
};
type SlotLinkPreferenceMap = Record<string, SlotLinkMode>;
const SLOT_LINK_PREFS_KEY = "package_slot_link_prefs";
const readSlotLinkPrefs = (): SlotLinkPreferenceMap => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SLOT_LINK_PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    return {};
  }
};
const writeSlotLinkPrefs = (prefs: SlotLinkPreferenceMap) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SLOT_LINK_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
};
type StatusFilter = "all" | "full" | "low" | "out";
const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "full", label: "Full" },
  { value: "low", label: "Low (<2 slots)" },
  { value: "out", label: "Out" },
];
const SLOT_LINK_OPTIONS: Array<{
  value: SlotLinkMode;
  label: string;
  helper: string;
}> = [
  {
    value: "information",
    label: "Information Order",
    helper: "Match order information fields",
  },
  {
    value: "slot",
    label: "Slot",
    helper: "Match order slot identifiers",
  },
];
const parseNumericValue = (input: unknown): number | null => {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }
  if (typeof input === "string") {
    const cleaned = input.replace(/[^0-9.-]/g, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};
const toInputString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
};
const buildInformationSummary = (
  user?: string | null,
  pass?: string | null,
  mail?: string | null
): string => {
  return (
    [
      user && `User: ${user}`,
      pass && `Pass: ${pass}`,
      mail && `Mail 2nd: ${mail}`,
    ]
      .filter(Boolean)
      .join(" | ") || ""
  );
};
const buildFormValuesFromRow = (
  row: PackageRow | AugmentedRow
): PackageFormValues => {
  const slotValue =
    "slotLimit" in row && typeof row.slotLimit === "number"
      ? String(row.slotLimit)
      : toInputString(row.slot);
  const capacityValue =
    "capacityLimit" in row && typeof row.capacityLimit === "number"
      ? String(row.capacityLimit)
      : toInputString(row.capacity);
  return {
    informationUser: row.informationUser ?? "",
    informationPass: row.informationPass ?? "",
    informationMail: row.informationMail ?? "",
    note: row.note ?? "",
    accountUser: row.accountUser ?? "",
    accountPass: row.accountPass ?? "",
    accountMail: row.accountMail ?? "",
    accountNote: row.accountNote ?? "",
    supplier: row.supplier ?? "",
    import: toInputString(row.import),
    expired: row.expired ?? "",
    capacity: capacityValue,
    slot: slotValue,
    slotLinkMode: row.slotLinkMode ?? "information",
    hasCapacity: row.hasCapacityField ?? false,
  };
};
function PackageProduct() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersReady, setOrdersReady] = useState(false);
  const [slotLinkPrefs, setSlotLinkPrefs] = useState<SlotLinkPreferenceMap>(
    () => readSlotLinkPrefs()
  );
  const slotLinkPrefsRef = useRef(slotLinkPrefs);
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createInitialName, setCreateInitialName] = useState("");
  const [createInitialFields, setCreateInitialFields] = useState<
    PackageField[]
  >(PACKAGE_FIELD_OPTIONS.map((opt) => opt.value));
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editContext, setEditContext] = useState<EditContext | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRow, setViewRow] = useState<AugmentedRow | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const loading = packagesLoading || ordersLoading;
  useEffect(() => {
    slotLinkPrefsRef.current = slotLinkPrefs;
  }, [slotLinkPrefs]);
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
  const defaultTemplateFields = useMemo(
    () => PACKAGE_FIELD_OPTIONS.map((opt) => opt.value),
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
            const normalizedRows = data.map((row) => {
              const normalizedCapacity =
                row.capacity === undefined || row.capacity === null
                  ? null
                  : row.capacity;
              const normalizedHasCapacity =
                typeof row.hasCapacityField === "boolean"
                  ? row.hasCapacityField
                  : parseNumericValue(normalizedCapacity) !== null;
              const storedMode =
                row.id !== undefined && row.id !== null
                  ? slotLinkPrefsRef.current[String(row.id)]
                  : undefined;
              return {
                ...row,
                slot: row.slot ?? DEFAULT_SLOT_LIMIT,
                slotUsed: row.slotUsed ?? 0,
                capacity: normalizedCapacity,
                hasCapacityField: normalizedHasCapacity,
                slotLinkMode: storedMode ?? row.slotLinkMode ?? "information",
              };
            });
            setRows(normalizedRows);
          } else {
            setRows([]);
          }
        }
      } catch (error) {
        console.error("Load package products failed:", error);
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
        console.error("Load order list failed:", error);
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
  const packageNames = useMemo(
    () => Array.from(new Set(rows.map((row) => row.package))).sort(),
    [rows]
  );
  const orderMatchers = useMemo<NormalizedOrderRecord[]>(() => {
    return orders.map((order) => {
      const productKeys = buildIdentifierKeys(order.san_pham ?? "");
      const infoKeys = buildIdentifierKeys(order.thong_tin_san_pham ?? "");
      return {
        base: order,
        productKey: productKeys.normalized,
        productLettersKey: productKeys.lettersOnly,
        infoKey: infoKeys.normalized,
        infoLettersKey: infoKeys.lettersOnly,
        slotDisplay: toCleanString(order.slot),
        slotKey: normalizeSlotKey(order.slot),
        slotMatchKey: normalizeMatchKey(order.slot),
        informationDisplay: toCleanString(order.thong_tin_san_pham),
        informationKey: normalizeSlotKey(order.thong_tin_san_pham),
        informationMatchKey: normalizeMatchKey(order.thong_tin_san_pham),
        customerDisplay: toCleanString(order.khach_hang as string | null),
      };
    });
  }, [orders]);
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
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const packageParam = params.get("package");
    if (packageParam) {
      setCategoryFilter(packageParam);
    } else {
      setCategoryFilter("all");
    }
  }, [location.search]);
  const handleCategorySelect = useCallback(
    (value: string) => {
      setCategoryFilter(value);
      const params = new URLSearchParams(location.search);
      if (value === "all") {
        params.delete("package");
      } else {
        params.set("package", value);
      }
      const search = params.toString();
      navigate(
        {
          pathname: location.pathname,
          search: search ? `?${search}` : "",
        },
        { replace: true }
      );
    },
    [location.pathname, location.search, navigate]
  );
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
        const shouldMatchOrders =
          ordersReady && packageCode.length > 0 && orderMatchers.length > 0;
        const matchesProductRecord = (record: NormalizedOrderRecord) => {
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
        const relevantOrders = shouldMatchOrders
          ? orderMatchers.filter(
              (record) =>
                matchesProductRecord(record) && matchesLinkRecord(record)
            )
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
                : orderRecord.base?.id_don_hang !== undefined &&
                  orderRecord.base?.id_don_hang !== null
                ? `code:${orderRecord.base.id_don_hang}`
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
                  (orderRecord.base?.id_don_hang as string | number | null) ??
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
        };
      }),
    [rows, orderMatchers, ordersReady]
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
  const filteredRows = scopedRows.filter((item) => {
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
  });
  const hasCapacityRows = filteredRows.some(
    (row) => row.hasCapacityField ?? false
  );
  const showCapacityColumn =
    hasCapacityRows ||
    (filteredRows.length === 0 &&
      (selectedTemplate?.fields.includes("capacity") ?? false));
  const tableColumnCount = showCapacityColumn ? 9 : 8;
  const slotStats = useMemo(
    () =>
      [
        {
          name: "Tổng Nhóm",
          value: String(scopedRows.length),
          icon: CheckCircleIcon,
          accent: STAT_CARD_ACCENTS.sky,
        },
        {
          name: "Gần Hết Slot",
          value: String(
            scopedRows.reduce(
              (total, row) =>
                getSlotAvailabilityState(row.remainingSlots) === "low"
                  ? total + 1
                  : total,
              0
            )
          ),
          icon: ExclamationTriangleIcon,
          accent: STAT_CARD_ACCENTS.amber,
        },
        {
          name: "Hết Slot",
          value: String(
            scopedRows.reduce(
              (total, row) =>
                getSlotAvailabilityState(row.remainingSlots) === "out"
                  ? total + 1
                  : total,
              0
            )
          ),
          icon: ArrowDownIcon,
          accent: STAT_CARD_ACCENTS.rose,
        },
        {
          name: "Tạo Mới Hôm Nay",
          value: "0",
          icon: ArrowUpIcon,
          accent: STAT_CARD_ACCENTS.emerald,
        },
      ] as const,
    [scopedRows]
  );
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
  const openCreateModal = useCallback(
    (initialName = "", initialFields?: PackageField[]) => {
      setCreateInitialName(initialName);
      setCreateInitialFields(
        initialFields && initialFields.length > 0
          ? initialFields
          : defaultTemplateFields
      );
      setCreateModalOpen(true);
    },
    [defaultTemplateFields]
  );
  const handleCreateTemplate = useCallback(
    (name: string, fields: PackageField[]) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setTemplates((prev) => {
        const next = prev.filter((tpl) => tpl.name !== trimmed);
        next.push({ name: trimmed, fields, isCustom: true });
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      setCreateModalOpen(false);
      handleCategorySelect(trimmed);
    },
    [handleCategorySelect]
  );
  const handleAddSubmit = useCallback(
    async (values: PackageFormValues) => {
      if (!selectedTemplate) return;
      const includeAccountStorage =
        selectedTemplate.fields.includes("capacity");
      const includePackageInfo =
        selectedTemplate.fields.includes("information");
      const includeNote = selectedTemplate.fields.includes("note");
      const includeSupplier = selectedTemplate.fields.includes("supplier");
      const includeImport = selectedTemplate.fields.includes("import");
      const includeExpired = true;
      const parsedSlotLimit = parseNumericValue(values.slot);
      const slotLimit =
        parsedSlotLimit !== null && parsedSlotLimit > 0
          ? Math.floor(parsedSlotLimit)
          : DEFAULT_SLOT_LIMIT;
      const parsedCapacityLimit = parseNumericValue(values.capacity);
      const capacityLimit =
        parsedCapacityLimit !== null && parsedCapacityLimit > 0
          ? Math.floor(parsedCapacityLimit)
          : DEFAULT_CAPACITY_LIMIT;
      const packageInfoSummary = includePackageInfo
        ? buildInformationSummary(
            values.informationUser || null,
            values.informationPass || null,
            values.informationMail || null
          )
        : "";
      const payload = {
        packageName: selectedTemplate.name,
        informationUser: includePackageInfo
          ? values.informationUser || null
          : null,
        informationPass: includePackageInfo
          ? values.informationPass || null
          : null,
        informationMail: includePackageInfo
          ? values.informationMail || null
          : null,
        note: includeNote ? values.note || null : null,
        supplier: includeSupplier ? values.supplier || null : null,
        importPrice: includeImport ? Number(values.import || 0) || 0 : null,
        accountUser: includeAccountStorage ? values.accountUser || null : null,
        accountPass: includeAccountStorage ? values.accountPass || null : null,
        accountMail: includeAccountStorage ? values.accountMail || null : null,
        accountNote: includeAccountStorage ? values.accountNote || null : null,
        capacity: includeAccountStorage ? capacityLimit : null,
        hasCapacityField: includeAccountStorage,
        expired: includeExpired ? values.expired || null : null,
        slotLimit,
        slotLinkMode: values.slotLinkMode,
      };
      try {
        const res = await apiFetch(`/api/package-products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const created = (await res.json()) as PackageRow;
        const mergedRow: PackageRow = {
          ...created,
          slot: slotLimit,
          slotUsed: 0,
          capacity: includeAccountStorage ? capacityLimit : created.capacity,
          information: includePackageInfo
            ? packageInfoSummary || null
            : created.information,
          slotLinkMode: values.slotLinkMode,
          hasCapacityField: includeAccountStorage,
        };
        setRows((prev) => [...prev, mergedRow]);
        if (created.id !== undefined && created.id !== null) {
          persistSlotLinkPreference(created.id, values.slotLinkMode);
        }
        setAddModalOpen(false);
      } catch (error) {
        console.error("Lỗi khi tạo gói sản phẩm:", error);
      }
    },
    [persistSlotLinkPreference, selectedTemplate]
  );
  const handleCreateButtonClick = () => {
    if (selectedPackage && selectedTemplate) {
      openCreateModal(selectedPackage, selectedTemplate.fields);
      return;
    }
    openCreateModal();
  };
  const handleAddButtonClick = () => {
    if (!selectedPackage) return;
    if (!selectedTemplate) {
      openCreateModal(selectedPackage, defaultTemplateFields);
      return;
    }
    setAddModalOpen(true);
  };
  const openEditModal = useCallback(
    (row: AugmentedRow) => {
      const template = templates.find((tpl) => tpl.name === row.package) ?? {
        name: row.package,
        fields: row.hasCapacityField
          ? defaultTemplateFields
          : stripCapacityFields(defaultTemplateFields),
        isCustom: false,
      };
      setEditContext({
        rowId: row.id,
        template,
        initialValues: buildFormValuesFromRow(row),
        accountStorageId: row.accountStorageId ?? null,
      });
      setEditModalOpen(true);
    },
    [templates, defaultTemplateFields]
  );
  const closeEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditContext(null);
  }, []);
  const openViewModal = useCallback((row: AugmentedRow) => {
    setViewRow(row);
    setViewModalOpen(true);
  }, []);
  const closeViewModal = useCallback(() => {
    setViewModalOpen(false);
    setViewRow(null);
  }, []);
  const handleRowToggle = useCallback((rowId: number) => {
    setExpandedRowId((prev) => (prev === rowId ? null : rowId));
  }, []);
  const handleEditSubmit = useCallback(
    async (values: PackageFormValues) => {
      if (!editContext) return;
      const { template, rowId, accountStorageId } = editContext;
      const includeAccountStorage = template.fields.includes("capacity");
      const includePackageInfo = template.fields.includes("information");
      const includeNote = template.fields.includes("note");
      const includeSupplier = template.fields.includes("supplier");
      const includeImport = template.fields.includes("import");
      const includeExpired = true;
      const parsedSlotLimit = parseNumericValue(values.slot);
      const slotLimit =
        parsedSlotLimit !== null && parsedSlotLimit > 0
          ? Math.floor(parsedSlotLimit)
          : DEFAULT_SLOT_LIMIT;
      const parsedCapacityLimit = parseNumericValue(values.capacity);
      const capacityLimit =
        parsedCapacityLimit !== null && parsedCapacityLimit > 0
          ? Math.floor(parsedCapacityLimit)
          : DEFAULT_CAPACITY_LIMIT;
      const packageInfoSummary = includePackageInfo
        ? buildInformationSummary(
            values.informationUser || null,
            values.informationPass || null,
            values.informationMail || null
          )
        : "";
      const payload = {
        packageName: template.name,
        informationUser: includePackageInfo
          ? values.informationUser || null
          : null,
        informationPass: includePackageInfo
          ? values.informationPass || null
          : null,
        informationMail: includePackageInfo
          ? values.informationMail || null
          : null,
        note: includeNote ? values.note || null : null,
        supplier: includeSupplier ? values.supplier || null : null,
        importPrice: includeImport ? Number(values.import || 0) || 0 : null,
        expired: includeExpired ? values.expired || null : null,
        slotLimit,
        accountStorageId: accountStorageId ?? null,
        accountUser: includeAccountStorage ? values.accountUser || null : null,
        accountPass: includeAccountStorage ? values.accountPass || null : null,
        accountMail: includeAccountStorage ? values.accountMail || null : null,
        accountNote: includeAccountStorage ? values.accountNote || null : null,
        capacity: includeAccountStorage ? capacityLimit : null,
        hasCapacityField: includeAccountStorage,
        slotLinkMode: values.slotLinkMode,
      };
      try {
        const res = await apiFetch(`/api/package-products/${rowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const updated = (await res.json()) as PackageRow;
        const mergedRow: PackageRow = {
          ...updated,
          slot: slotLimit,
          capacity: includeAccountStorage ? capacityLimit : updated.capacity,
          information: includePackageInfo
            ? packageInfoSummary || null
            : updated.information,
          slotLinkMode: values.slotLinkMode,
          hasCapacityField: includeAccountStorage,
        };
        setRows((prev) =>
          prev.map((row) => (row.id === rowId ? mergedRow : row))
        );
        persistSlotLinkPreference(rowId, values.slotLinkMode);
        closeEditModal();
      } catch (error) {
        console.error(`Cập nhật Gói Sản Phẩm ${rowId} Lỗi:`, error);
      }
    },
    [editContext, closeEditModal, persistSlotLinkPreference]
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gói Sản Phẩm</h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý các Gói Sản Phẩm và các mục nhập gói riêng
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap gap-3">
          <GradientButton icon={PlusIcon} onClick={handleCreateButtonClick}>
            Tạo Nhóm Mới
          </GradientButton>
          <GradientButton
            icon={PlusIcon}
            onClick={handleAddButtonClick}
            disabled={!selectedPackage}
          >
            Thêm Gói Mới
          </GradientButton>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {slotStats.map((stat) => (
          <StatCard
            key={stat.name}
            title={stat.name}
            value={stat.value}
            icon={stat.icon}
            accent={stat.accent}
          />
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Tổng Quan Về Gói
            </h2>
            <p className="text-sm text-gray-500">
              Chọn một gói bên dưới để xem chi tiết
            </p>
          </div>
        </div>
        {packageSummaries.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">Không có dữ liệu gói.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {packageSummaries.map((summary, index) => {
              const isSelected = summary.name === selectedPackage;
              const accent =
                SUMMARY_CARD_ACCENTS[index % SUMMARY_CARD_ACCENTS.length];
              return (
                <div
                  key={summary.name}
                  className={`relative isolate rounded-3xl border ${
                    accent.border
                  } bg-white/80 p-5 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.7)] backdrop-blur transition duration-200 ${
                    isSelected
                      ? "ring-2 ring-blue-400 shadow-[0_25px_65px_-35px_rgba(37,99,235,0.7)]"
                      : "hover:shadow-[0_30px_75px_-40px_rgba(15,23,42,0.55)]"
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br ${accent.glow} opacity-80 blur-2xl`}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                        Tổng Quan
                      </p>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {summary.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Tổng số gói: {summary.total}
                      </p>
                    </div>
                    {isSelected ? (
                      <button
                        type="button"
                        onClick={() => handleCategorySelect("all")}
                        className="text-sm font-semibold text-rose-600 hover:text-rose-700 transition"
                      >
                        Hủy
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCategorySelect(summary.name)}
                        className={`text-sm font-semibold ${accent.link} transition`}
                      >
                        Xem Chi Tiết
                      </button>
                    )}
                  </div>
                  <dl className="mt-5 grid grid-cols-3 gap-4 text-sm">
                    <div className="rounded-2xl border border-white/60 bg-white/70 p-3 text-center shadow-inner">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tổng
                      </dt>
                      <dd className="mt-1 text-2xl font-bold text-slate-900">
                        {summary.total}
                      </dd>
                    </div>
                    <div className="rounded-2xl border border-amber-100/70 bg-amber-50/60 p-3 text-center shadow-inner">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                        Thấp
                      </dt>
                      <dd className="mt-1 text-2xl font-bold text-amber-500">
                        {summary.low}
                      </dd>
                    </div>
                    <div className="rounded-2xl border border-rose-100/70 bg-rose-50/60 p-3 text-center shadow-inner">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-rose-600">
                        Hết
                      </dt>
                      <dd className="mt-1 text-2xl font-bold text-rose-500">
                        {summary.out}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {selectedPackage && (
        <>
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-3">
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm gói hoặc thông tin sản phẩm"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-700"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filteredRows.length
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
                disabled={!filteredRows.length}
              >
                {selectedPackage
                  ? `Export ${selectedPackage}`
                  : "Export report"}
              </button>
            </div>
            <div className="text-sm text-gray-500">
              Đang Xem:{" "}
              <span className="font-medium text-gray-900">
                {selectedPackage ?? "All packages"}
              </span>
              {statusFilter !== "all" && (
                <>
                  {" "}
                  •{" "}
                  <span className="font-medium text-gray-900">
                    {
                      STATUS_FILTERS.find(
                        (option) => option.value === statusFilter
                      )?.label
                    }
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gói
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thông Tin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ghi Chú
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slot
                    </th>
                    {showCapacityColumn && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dung Lượng
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nhà Cung Cấp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Giá Nhập
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hết Hạn
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành Động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={tableColumnCount}
                        className="px-6 py-8 text-center text-gray-500 text-sm"
                      >
                        Đang Tải...
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={tableColumnCount}
                        className="px-6 py-8 text-center text-gray-500 text-sm"
                      >
                        Không Có Dữ Liệu
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((item, idx) => {
                      const totalSlots = item.slotLimit || DEFAULT_SLOT_LIMIT;
                      const slotUsed = item.slotUsed;
                      const remainingSlots = item.remainingSlots;
                      const slotAvailabilityRatio =
                        totalSlots > 0
                          ? Math.min((remainingSlots / totalSlots) * 100, 100)
                          : 0;
                      const slotAvailabilityState =
                        getSlotAvailabilityState(remainingSlots);
                      const slotColorClass =
                        slotAvailabilityState === "out"
                          ? "bg-red-500"
                          : slotAvailabilityState === "low"
                          ? "bg-yellow-500"
                          : "bg-green-500";

                      const capacityLimit =
                        item.capacityLimit || DEFAULT_CAPACITY_LIMIT;
                      const capacityUsed = item.capacityUsed;
                      const remainingCapacity = item.remainingCapacity;
                      const capacityAvailabilityRatio =
                        capacityLimit > 0
                          ? Math.min(
                              (remainingCapacity / capacityLimit) * 100,
                              100
                            )
                          : 0;
                      const capacityAvailabilityState =
                        getCapacityAvailabilityState(
                          remainingCapacity,
                          capacityLimit
                        );
                      const capacityColorClass =
                        capacityAvailabilityState === "out"
                          ? "bg-red-500"
                          : capacityAvailabilityState === "low"
                          ? "bg-yellow-500"
                          : "bg-green-500";
                      const usedWithinLimit = Math.min(slotUsed, totalSlots);
                      const slotAssignments = item.slotAssignments ?? [];
                      const slotCells = Array.from(
                        { length: Math.max(totalSlots, 0) },
                        (_, slotIdx) => {
                          const slotNumber = slotIdx + 1;
                          const isUsed = slotNumber <= usedWithinLimit;
                          const assignment =
                            slotAssignments[slotNumber - 1] ?? null;
                          return { slotNumber, isUsed, assignment };
                        }
                      );
                      const showRowCapacity =
                        showCapacityColumn && !!item.hasCapacityField;
                      const isExpanded = expandedRowId === item.id;
                      return (
                        <React.Fragment key={`${item.id}-${idx}`}>
                          <tr
                            onClick={() => handleRowToggle(item.id)}
                            className={`hover:bg-gray-50 ${
                              isExpanded ? "bg-gray-50" : ""
                            } cursor-pointer`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.package}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.informationUser || ""}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.note || ""}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                <span className="font-medium">{slotUsed}</span>{" "}
                                / {totalSlots} slots
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div
                                  className={`h-2 rounded-full ${slotColorClass}`}
                                  style={{ width: `${slotAvailabilityRatio}%` }}
                                />
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Còn lại: {remainingSlots}
                              </div>
                            </td>
                            {showCapacityColumn && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                {showRowCapacity ? (
                                  <>
                                    <div className="text-sm text-gray-900">
                                      <span className="font-medium">
                                        {capacityUsed}
                                      </span>{" "}
                                      / {capacityLimit}
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                      <div
                                        className={`h-2 rounded-full ${capacityColorClass}`}
                                        style={{
                                          width: `${capacityAvailabilityRatio}%`,
                                        }}
                                      />
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Còn lại: {remainingCapacity}
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-sm text-gray-400 italic">
                                    Dung Lượng trống
                                  </div>
                                )}
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.supplier || ""}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {Number(item.import || 0).toLocaleString("vi-VN")}{" "}
                              VND
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDisplayDate(item.expired)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                              <button
                                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                                type="button"
                                aria-label="Edit package"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(item);
                                }}
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition"
                                type="button"
                                aria-label="Show package details"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openViewModal(item);
                                }}
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td
                                colSpan={tableColumnCount}
                                className="bg-gray-50 px-6 py-4"
                              >
                                <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-4 text-center">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      Chi tiết slot
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Hiển Thị {totalSlots} slots — {slotUsed}{" "}
                                      Sử Dụng, {remainingSlots} Khả Dụng
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap justify-center gap-3">
                                    {slotCells.map((slot) => (
                                      <div
                                        key={slot.slotNumber}
                                        className={`flex flex-col items-center justify-center rounded-lg border px-3 py-2 basis-1/2 sm:basis-1/3 lg:basis-1/5 min-w-[120px] ${
                                          slot.isUsed
                                            ? "border-yellow-300 bg-yellow-50"
                                            : "border-green-200 bg-green-50"
                                        }`}
                                        title={
                                          slot.assignment?.matchValue ||
                                          slot.assignment?.slotLabel ||
                                          undefined
                                        }
                                      >
                                        <div className="flex items-center gap-2">
                                          <BoltIcon
                                            className={`h-5 w-5 ${
                                              slot.isUsed
                                                ? "text-yellow-500"
                                                : "text-green-500"
                                            }`}
                                          />
                                          <span className="text-sm font-semibold text-gray-900">
                                            {slot.assignment?.slotLabel
                                              ? slot.assignment.slotLabel
                                              : `Slot ${slot.slotNumber}`}
                                          </span>
                                        </div>
                                        <p
                                          className={`text-xs mt-1 ${
                                            slot.isUsed
                                              ? "text-yellow-700"
                                              : "text-green-700"
                                          }`}
                                        >
                                          {slot.assignment && showRowCapacity
                                            ? formatCapacityLabel(
                                                slot.assignment.capacityUnits
                                              )
                                            : slot.isUsed
                                            ? "Used"
                                            : "Available"}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <CreatePackageModal
        open={createModalOpen}
        initialName={createInitialName}
        initialFields={createInitialFields}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateTemplate}
      />
      {selectedTemplate && (
        <PackageFormModal
          mode="add"
          open={addModalOpen}
          template={selectedTemplate}
          onClose={() => setAddModalOpen(false)}
          onSubmit={handleAddSubmit}
        />
      )}
      {editModalOpen && editContext && (
        <PackageFormModal
          mode="edit"
          open={editModalOpen}
          template={editContext.template}
          initialValues={editContext.initialValues}
          onClose={closeEditModal}
          onSubmit={handleEditSubmit}
        />
      )}
      <PackageViewModal
        open={viewModalOpen}
        row={viewRow}
        onClose={closeViewModal}
      />
    </div>
  );
}
type ModalShellProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
};
function ModalShell({
  open,
  title,
  onClose,
  children,
  footer,
}: ModalShellProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-4xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          {footer}
        </div>
      </div>
    </div>
  );
}
type CreatePackageModalProps = {
  open: boolean;
  initialName: string;
  initialFields: PackageField[];
  onClose: () => void;
  onSubmit: (name: string, fields: PackageField[]) => void;
};
function CreatePackageModal({
  open,
  initialName,
  initialFields,
  onClose,
  onSubmit,
}: CreatePackageModalProps) {
  const [name, setName] = useState(initialName);
  const [fields, setFields] = useState<Set<PackageField>>(
    new Set(initialFields)
  );
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setName(initialName);
      setFields(new Set(initialFields));
      setError(null);
    }
  }, [open, initialFields, initialName]);
  const toggleField = (field: PackageField) => {
    setFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };
  const selectAll = () =>
    setFields(new Set(PACKAGE_FIELD_OPTIONS.map((opt) => opt.value)));
  const clearAll = () => setFields(new Set());
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Vui lòng nhập tên gói.");
      return;
    }
    if (fields.size === 0) {
      setError("Vui lòng chọn ít nhất một trường.");
      return;
    }
    onSubmit(trimmed, Array.from(fields));
  };
  return (
    <ModalShell
      open={open}
      title="Tạo gói mới"
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            Lưu
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên Gói
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Example: Google One"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Chọn Các Trường Dưới Đây
            </label>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="text-blue-600 hover:text-blue-700"
              >
                Chọn Tất Cả
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-gray-500 hover:text-gray-600"
              >
                Làm Mới
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PACKAGE_FIELD_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-start gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:border-blue-300 transition"
              >
                <input
                  type="checkbox"
                  checked={fields.has(option.value)}
                  onChange={() => toggleField(option.value)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </ModalShell>
  );
}
type PackageViewModalProps = {
  open: boolean;
  row: AugmentedRow | null;
  onClose: () => void;
};
function PackageViewModal({ open, row, onClose }: PackageViewModalProps) {
  if (!open || !row) return null;
  const packageDetails = [
    { label: "User", value: row.informationUser },
    { label: "Pass", value: row.informationPass },
    { label: "Mail 2nd", value: row.informationMail },
    { label: "Note", value: row.note },
    { label: "Supplier", value: row.supplier },
    { label: "Import", value: row.import },
    { label: "Expired", value: formatDisplayDate(row.expired) },
  ];
  const accountDetails = [
    { label: "Account user", value: row.accountUser },
    { label: "Account pass", value: row.accountPass },
    { label: "Mail 2nd", value: row.accountMail },
    { label: "Account note", value: row.accountNote },
  ];
  const showAccountStorage = !!row.hasCapacityField;
  const capacityLimit = row.capacityLimit || DEFAULT_CAPACITY_LIMIT;
  const capacityUsed = row.capacityUsed || 0;
  const remainingCapacity = row.remainingCapacity || 0;
  const capacityAvailabilityRatio =
    capacityLimit > 0
      ? Math.min((remainingCapacity / capacityLimit) * 100, 100)
      : 0;
  const capacityAvailabilityState = getCapacityAvailabilityState(
    remainingCapacity,
    capacityLimit
  );
  const capacityColorClass =
    capacityAvailabilityState === "out"
      ? "bg-red-500"
      : capacityAvailabilityState === "low"
      ? "bg-yellow-500"
      : "bg-green-500";
  return (
    <ModalShell
      open={open}
      title={`Package Details - ${row.package}`}
      onClose={onClose}
      footer={
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
        >
          Đóng
        </button>
      }
    >
      <div
        className={`grid grid-cols-1 gap-4 ${
          showAccountStorage ? "md:grid-cols-2" : ""
        }`}
      >
        <section className="border border-gray-200 rounded-lg p-4 space-y-4 bg-white">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Tên Gói</h3>
            <p className="text-xs text-gray-500">
              Đã lưu trữ các trường mô tả cho gói này.
            </p>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-sm">
            {packageDetails.map((detail) => (
              <div key={detail.label}>
                <dt className="text-[11px] uppercase tracking-wide text-gray-500">
                  {detail.label}
                </dt>
                <dd className="text-sm font-medium text-gray-900 break-words">
                  {detail.value !== null &&
                  detail.value !== undefined &&
                  detail.value !== ""
                    ? detail.value
                    : "-"}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        {showAccountStorage && (
          <section className="border border-gray-200 rounded-lg p-4 space-y-4 bg-white">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Tài Khoản Dung Lượng
              </h3>
              <p className="text-xs text-gray-500">
                Tổng quan về tài khoản dung lượng
              </p>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm">
              {accountDetails.map((detail) => (
                <div key={detail.label}>
                  <dt className="text-[11px] uppercase tracking-wide text-gray-500">
                    {detail.label}
                  </dt>
                  <dd className="text-sm font-medium text-gray-900 break-words">
                    {detail.value !== null &&
                    detail.value !== undefined &&
                    detail.value !== ""
                      ? detail.value
                      : "-"}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="space-y-1">
              <div className="text-sm text-gray-900">
                <span className="font-semibold">{capacityUsed}</span> /{" "}
                {capacityLimit} Dung Lượng
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${capacityColorClass}`}
                  style={{ width: `${capacityAvailabilityRatio}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">
                Khả Dụng: {remainingCapacity}
              </div>
            </div>
          </section>
        )}
      </div>
    </ModalShell>
  );
}
type PackageFormModalProps = {
  open: boolean;
  mode: "add" | "edit";
  template: PackageTemplate;
  initialValues?: PackageFormValues;
  onClose: () => void;
  onSubmit: (values: PackageFormValues) => void;
};
function PackageFormModal({
  open,
  mode,
  template,
  initialValues,
  onClose,
  onSubmit,
}: PackageFormModalProps) {
  const mergedInitialValues = useMemo(
    () => ({
      ...EMPTY_FORM_VALUES,
      ...(initialValues ?? {}),
    }),
    [initialValues]
  );
  const [values, setValues] = useState<PackageFormValues>(mergedInitialValues);
  useEffect(() => {
    if (open) {
      setValues(mergedInitialValues);
    }
  }, [open, mergedInitialValues]);
  const handleChange = (
    field: keyof PackageFormValues,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setValues((prev) => ({ ...prev, [field]: value }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };
  const handleSlotLinkModeChange = (mode: SlotLinkMode) => {
    setValues((prev) => ({ ...prev, slotLinkMode: mode }));
  };
  const packageDetailFields: PackageField[] = [
    "information",
    "note",
    "supplier",
    "import",
    "expired",
  ];
  const showPackageDetailsSection = packageDetailFields.some((field) =>
    template.fields.includes(field)
  );
  const showAccountStorageSection = template.fields.includes("capacity");
  const showSectionGrid =
    showPackageDetailsSection || showAccountStorageSection;
  const shouldUseTwoColumns =
    showPackageDetailsSection && showAccountStorageSection;
  return (
    <ModalShell
      open={open}
      title={`${mode === "add" ? "Add" : "Edit"} Package - ${template.name}`}
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            {mode === "add" ? "Save Package" : "Save Changes"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {showSectionGrid && (
          <div
            className={`grid grid-cols-1 gap-4 ${
              shouldUseTwoColumns ? "md:grid-cols-2" : ""
            }`}
          >
            {showPackageDetailsSection && (
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Tên Gói
                  </h3>
                  <p className="text-xs text-gray-500">
                    Nhập các trường mô tả liên quan đến gói này.
                  </p>
                </div>
                {template.fields.includes("information") && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tài Khoản
                        </label>
                        <input
                          type="text"
                          value={values.informationUser}
                          onChange={(e) => handleChange("informationUser", e)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="username"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mật khẩu
                        </label>
                        <input
                          type="text"
                          value={values.informationPass}
                          onChange={(e) => handleChange("informationPass", e)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="password"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mail Dự phòng
                      </label>
                      <input
                        type="email"
                        value={values.informationMail}
                        onChange={(e) => handleChange("informationMail", e)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="secondary email"
                      />
                    </div>
                  </div>
                )}
                {template.fields.includes("note") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ghi Chú
                    </label>
                    <input
                      type="text"
                      value={values.note}
                      onChange={(e) => handleChange("note", e)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Optional note"
                    />
                  </div>
                )}
                {template.fields.includes("supplier") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nhà Cung Cấp
                    </label>
                    <input
                      type="text"
                      value={values.supplier}
                      onChange={(e) => handleChange("supplier", e)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
                {template.fields.includes("import") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giá Nhập
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={values.import}
                      onChange={(e) => handleChange("import", e)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày Hết Hạn
                  </label>
                  <input
                    type="date"
                    value={values.expired}
                    onChange={(e) => handleChange("expired", e)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
            {showAccountStorageSection && (
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Tài Khoản Dung Lượng
                  </h3>
                  <p className="text-xs text-gray-500">
                    Cung cấp thông tin tài khoản dung lượng
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tài Khoản
                    </label>
                    <input
                      type="text"
                      value={values.accountUser}
                      onChange={(e) => handleChange("accountUser", e)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mật khẩu
                    </label>
                    <input
                      type="text"
                      value={values.accountPass}
                      onChange={(e) => handleChange("accountPass", e)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mail dự phòng
                    </label>
                    <input
                      type="email"
                      value={values.accountMail}
                      onChange={(e) => handleChange("accountMail", e)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="secondary email"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    value={values.accountNote}
                    onChange={(e) => handleChange("accountNote", e)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Account details note"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dung Lượng
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={values.capacity}
                    onChange={(e) => handleChange("capacity", e)}
                    placeholder={`Default ${DEFAULT_CAPACITY_LIMIT}`}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slot limit
          </label>
          <input
            type="number"
            min={0}
            value={values.slot}
            onChange={(e) => handleChange("slot", e)}
            placeholder={`Default ${DEFAULT_SLOT_LIMIT}`}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Package ↔ Order matching
              </p>
              <p className="text-xs text-gray-500">
                Choose how slots are counted from orders.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SLOT_LINK_OPTIONS.map((option) => {
              const isSelected = values.slotLinkMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSlotLinkModeChange(option.value)}
                  className={`border rounded-lg p-3 text-left transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-blue-300 text-gray-700"
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    {option.label}
                  </span>
                  <span className="block text-xs text-gray-500 mt-1">
                    {option.helper}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Information Order: compare package Information with order details.
            Slot: compare package Information with order slot references.
          </p>
        </div>
        {template.fields.length === 0 && (
          <p className="text-sm text-gray-500">
            This template does not have any configured fields.
          </p>
        )}
      </form>
    </ModalShell>
  );
}
export default PackageProduct;
