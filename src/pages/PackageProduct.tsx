import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
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
};
type AugmentedRow = PackageRow & {
  slotUsed: number;
  slotLimit: number;
  remainingSlots: number;
  capacityLimit: number;
  capacityUsed: number;
  remainingCapacity: number;
};
type PackageTemplate = {
  name: string;
  fields: PackageField[];
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
};
const PACKAGE_FIELD_OPTIONS: Array<{ value: PackageField; label: string }> = [
  { value: "information", label: "Package information" },
  { value: "note", label: "Note" },
  { value: "supplier", label: "Supplier" },
  { value: "import", label: "Import price (VND)" },
  { value: "expired", label: "Expired date" },
  { value: "capacity", label: "Total capacity (slots)" },
];
const DEFAULT_SLOT_LIMIT = 5;
const DEFAULT_CAPACITY_LIMIT = 2000;
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
type StatusFilter = "all" | "full" | "low" | "out";
const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "full", label: "Full" },
  { value: "low", label: "Low (<2 slots)" },
  { value: "out", label: "Out" },
];
const SLOT_LINK_OPTIONS: Array<{ value: SlotLinkMode; label: string; helper: string }> = [
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
const buildFormValuesFromRow = (row: PackageRow | AugmentedRow): PackageFormValues => {
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
  };
};
function PackageProduct() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createInitialName, setCreateInitialName] = useState("");
  const [createInitialFields, setCreateInitialFields] = useState<PackageField[]>(
    PACKAGE_FIELD_OPTIONS.map((opt) => opt.value)
  );
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editContext, setEditContext] = useState<EditContext | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const defaultTemplateFields = useMemo(
    () => PACKAGE_FIELD_OPTIONS.map((opt) => opt.value),
    []
  );
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/package-products`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as PackageRow[];
        if (Array.isArray(data)) {
          setRows(
            data.map((row) => ({
              ...row,
              slot: row.slot ?? DEFAULT_SLOT_LIMIT,
              slotUsed: row.slotUsed ?? 0,
              capacity: row.capacity ?? DEFAULT_CAPACITY_LIMIT,
              slotLinkMode: row.slotLinkMode ?? "information",
            }))
          );
        } else {
          setRows([]);
        }
      } catch (error) {
        console.error("Load package products failed:", error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const packageNames = useMemo(
    () => Array.from(new Set(rows.map((row) => row.package))).sort(),
    [rows]
  );
  useEffect(() => {
    setTemplates((prev) => {
      const map = new Map(prev.map((tpl) => [tpl.name, tpl]));
      let changed = false;
      packageNames.forEach((name) => {
        if (name && !map.has(name)) {
          map.set(name, { name, fields: defaultTemplateFields });
          changed = true;
        }
      });
      if (!changed) return prev;
      return Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    });
  }, [packageNames, defaultTemplateFields]);
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
      rows.map((item, idx) => {
        const slotLimitRaw = parseNumericValue(item.slot);
        const slotLimit =
          slotLimitRaw && slotLimitRaw > 0
            ? Math.floor(slotLimitRaw)
            : DEFAULT_SLOT_LIMIT;
        const slotUsedRaw = parseNumericValue(
          (item as PackageRow).slotUsed
        );
        const fallbackSlotUsed =
          slotLimit > 0 ? Math.min(idx % (slotLimit + 1), slotLimit) : 0;
        const slotUsed = Math.min(
          Math.max(
            slotUsedRaw !== null ? Math.floor(slotUsedRaw) : fallbackSlotUsed,
            0
          ),
          slotLimit
        );
        const remainingSlots = Math.max(slotLimit - slotUsed, 0);

        const capacityLimitRaw = parseNumericValue(item.capacity);
        const capacityLimit =
          capacityLimitRaw && capacityLimitRaw > 0
            ? Math.floor(capacityLimitRaw)
            : DEFAULT_CAPACITY_LIMIT;
        const capacityUsedRaw = parseNumericValue(
          (item as PackageRow).capacityUsed
        );
        const fallbackCapacityUsed = Math.min(
          slotUsed * 100,
          capacityLimit
        );
        const capacityUsed = Math.min(
          Math.max(
            capacityUsedRaw !== null
              ? Math.floor(capacityUsedRaw)
              : fallbackCapacityUsed,
            0
          ),
          capacityLimit
        );
        const remainingCapacity = Math.max(
          capacityLimit - capacityUsed,
          0
        );
        return {
          ...item,
          slotUsed,
          slotLimit,
          remainingSlots,
          capacityLimit,
          capacityUsed,
          remainingCapacity,
        };
      }),
    [rows]
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
    const term = searchTerm.toLowerCase();
    const name = (item.package || "").toLowerCase();
    const sku = `PKG-${String(item.id).padStart(4, "0")}`.toLowerCase();
    const matchesSearch = name.includes(term) || sku.includes(term);
    const matchesCategory =
      categoryFilter === "all" || item.package === categoryFilter;
    const slotState = getSlotAvailabilityState(item.remainingSlots);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "full" && slotState === "ok") ||
      statusFilter === slotState;
    return matchesSearch && matchesCategory && matchesStatus;
  });
  const slotStats = useMemo(
    () =>
      [
        {
          name: "Total Packages",
          value: String(scopedRows.length),
          icon: CheckCircleIcon,
          color: "bg-blue-500",
        },
        {
          name: "Low Slots",
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
          color: "bg-yellow-500",
        },
        {
          name: "Out of Slots",
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
          color: "bg-red-500",
        },
        {
          name: "Created Today",
          value: "0",
          icon: ArrowUpIcon,
          color: "bg-green-500",
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
    const stats = new Map<string, { total: number; low: number; out: number }>();
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
        next.push({ name: trimmed, fields });
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
      const includeAccountStorage = selectedTemplate.fields.includes("capacity");
      const includePackageInfo = selectedTemplate.fields.includes("information");
      const includeNote = selectedTemplate.fields.includes("note");
      const includeSupplier = selectedTemplate.fields.includes("supplier");
      const includeImport = selectedTemplate.fields.includes("import");
      const includeExpired =
        includeAccountStorage && selectedTemplate.fields.includes("expired");
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
        informationUser: includePackageInfo ? values.informationUser || null : null,
        informationPass: includePackageInfo ? values.informationPass || null : null,
        informationMail: includePackageInfo ? values.informationMail || null : null,
        note: includeNote ? values.note || null : null,
        supplier: includeSupplier ? values.supplier || null : null,
        importPrice: includeImport ? Number(values.import || 0) || 0 : null,
        accountUser: includeAccountStorage ? values.accountUser || null : null,
        accountPass: includeAccountStorage ? values.accountPass || null : null,
        accountMail: includeAccountStorage ? values.accountMail || null : null,
        accountNote: includeAccountStorage ? values.accountNote || null : null,
        capacity: includeAccountStorage ? capacityLimit : null,
        expired: includeExpired ? values.expired || null : null,
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
          information: includePackageInfo ? packageInfoSummary || null : created.information,
          slotLinkMode: values.slotLinkMode,
        };
        setRows((prev) => [...prev, mergedRow]);
        setAddModalOpen(false);
      } catch (error) {
        console.error("Create package product failed:", error);
      }
    },
    [selectedTemplate]
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
      const template =
        templates.find((tpl) => tpl.name === row.package) ?? {
          name: row.package,
          fields: defaultTemplateFields,
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
      const includeExpired =
        includeAccountStorage && template.fields.includes("expired");
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
        informationUser: includePackageInfo ? values.informationUser || null : null,
        informationPass: includePackageInfo ? values.informationPass || null : null,
        informationMail: includePackageInfo ? values.informationMail || null : null,
        note: includeNote ? values.note || null : null,
        supplier: includeSupplier ? values.supplier || null : null,
        importPrice: includeImport ? Number(values.import || 0) || 0 : null,
        expired: includeExpired ? values.expired || null : null,
        accountStorageId: accountStorageId ?? null,
        accountUser: includeAccountStorage ? values.accountUser || null : null,
        accountPass: includeAccountStorage ? values.accountPass || null : null,
        accountMail: includeAccountStorage ? values.accountMail || null : null,
        accountNote: includeAccountStorage ? values.accountNote || null : null,
        capacity: includeAccountStorage ? capacityLimit : null,
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
          information: includePackageInfo ? packageInfoSummary || null : updated.information,
          slotLinkMode: values.slotLinkMode,
        };
        setRows((prev) =>
          prev.map((row) => (row.id === rowId ? mergedRow : row))
        );
        closeEditModal();
      } catch (error) {
        console.error(`Update package product ${rowId} failed:`, error);
      }
    },
    [editContext, closeEditModal]
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Package Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage package templates and individual package entries
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={handleCreateButtonClick}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" /> Create New Package
          </button>
          <button
            onClick={handleAddButtonClick}
            disabled={!selectedPackage}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border ${
              selectedPackage
                ? "bg-white text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors"
                : "bg-white text-gray-400 border-gray-200 cursor-not-allowed"
            }`}
          >
            <PlusIcon className="h-4 w-4 mr-2" /> Add New Package
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {slotStats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl p-6 shadow-sm transition w-full text-left"
          >
            <div className="flex items-center">
              <div className={`${stat.color} rounded-lg p-3`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4 text-left">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Package overview
            </h2>
            <p className="text-sm text-gray-500">
              Pick a package below to view details and add entries.
            </p>
          </div>
        </div>
        {packageSummaries.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">No package data yet.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {packageSummaries.map((summary) => {
              const isSelected = summary.name === selectedPackage;
              return (
                <div
                  key={summary.name}
                  className={`border rounded-xl p-5 transition ${
                    isSelected
                      ? "border-blue-400 bg-blue-50 shadow-sm"
                      : "border-gray-200 bg-gray-50 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {summary.name}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        Total entries: {summary.total}
                      </p>
                    </div>
                    {isSelected ? (
                      <button
                        type="button"
                        onClick={() => handleCategorySelect("all")}
                        className="text-sm font-medium text-red-500 hover:text-red-600 transition"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCategorySelect(summary.name)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 transition"
                      >
                        View details
                      </button>
                    )}
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">
                        Total
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {summary.total}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">
                        Low
                      </dt>
                      <dd className="text-lg font-semibold text-amber-500">
                        {summary.low}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">
                        Out
                      </dt>
                      <dd className="text-lg font-semibold text-red-500">
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
                  placeholder="Search packages by name or SKU..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-700"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
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
                {selectedPackage ? `Export ${selectedPackage}` : "Export report"}
              </button>
            </div>
            <div className="text-sm text-gray-500">
              Viewing:{" "}
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
                      Package
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Information
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Note
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Capacity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Import
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expired
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-6 py-8 text-center text-gray-500 text-sm"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-6 py-8 text-center text-gray-500 text-sm"
                      >
                        No data
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((item, idx) => {
                      const totalSlots = item.slotLimit || DEFAULT_SLOT_LIMIT;
                      const slotUsed = item.slotUsed;
                      const remainingSlots = item.remainingSlots;
                      const slotAvailabilityRatio =
                        totalSlots > 0
                          ? Math.min(
                              (remainingSlots / totalSlots) * 100,
                              100
                            )
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
                      const slotCells = Array.from(
                        { length: Math.max(totalSlots, 0) },
                        (_, slotIdx) => {
                          const slotNumber = slotIdx + 1;
                          const isUsed = slotNumber <= slotUsed;
                          return { slotNumber, isUsed };
                        }
                      );
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
                            {item.information || ""}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.note || ""}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <span className="font-medium">{slotUsed}</span> / {totalSlots} slots
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className={`h-2 rounded-full ${slotColorClass}`}
                                style={{ width: `${slotAvailabilityRatio}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Available: {remainingSlots}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <span className="font-medium">{capacityUsed}</span> / {capacityLimit}
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
                              Available: {remainingCapacity}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.supplier || ""}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {Number(item.import || 0).toLocaleString("vi-VN")} VND
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.expired || ""}
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
                              aria-label="Show slot information"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowToggle(item.id);
                              }}
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={9} className="bg-gray-50 px-6 py-4">
                                <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-4 text-center">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      Slot details
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Showing {totalSlots} slots — {slotUsed} used,{" "}
                                      {remainingSlots} available
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
                                            Slot {slot.slotNumber}
                                          </span>
                                        </div>
                                        <p
                                          className={`text-xs mt-1 ${
                                            slot.isUsed
                                              ? "text-yellow-700"
                                              : "text-green-700"
                                          }`}
                                        >
                                          {slot.isUsed ? "Used" : "Available"}
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
function ModalShell({ open, title, onClose, children, footer }: ModalShellProps) {
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
      setError("Please enter a package name.");
      return;
    }
    if (fields.size === 0) {
      setError("Please select at least one field.");
      return;
    }
    onSubmit(trimmed, Array.from(fields));
  };
  return (
    <ModalShell
      open={open}
      title="Create New Package"
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            Save Template
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Package name
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
              Fields included in this template
            </label>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="text-blue-600 hover:text-blue-700"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-gray-500 hover:text-gray-600"
              >
                Clear
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
  ];
  const showPackageDetailsSection = packageDetailFields.some((field) =>
    template.fields.includes(field)
  );
  const showAccountStorageSection = template.fields.includes("capacity");
  const showSectionGrid = showPackageDetailsSection || showAccountStorageSection;
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
            Cancel
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
                    Package Information
                  </h3>
                  <p className="text-xs text-gray-500">
                    Enter the descriptive fields tied to this package.
                  </p>
                </div>
                {template.fields.includes("information") && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          User
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
                          Pass
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
                        Mail 2nd
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
                      Note
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
                      Supplier
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
                      Import price (VND)
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
              </div>
            )}
            {showAccountStorageSection && (
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Account Storage
                  </h3>
                  <p className="text-xs text-gray-500">
                    Provide credentials tied to this capacity-based package.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      User
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
                      Pass
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
                      Mail 2nd
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
                    Note
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
                    Capacity (total slots)
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
                {template.fields.includes("expired") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expired date
                    </label>
                    <input
                      type="date"
                      value={values.expired}
                      onChange={(e) => handleChange("expired", e)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
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
