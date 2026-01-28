import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  PencilIcon,
  EyeIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import GradientButton from "../../../components/ui/GradientButton";
import StatCard, { STAT_CARD_ACCENTS } from "../../../components/ui/StatCard";
import { apiFetch } from "../../../lib/api";
import { PackageTable } from "./components/PackageTable";
import ConfirmModal from "../../../components/modals/ConfirmModal/ConfirmModal";
import { CreatePackageModal } from "./components/Modals/CreatePackageModal";
import { PackageFormModal } from "./components/Modals/PackageFormModal";
import { PackageViewModal } from "./components/Modals/PackageViewModal";
import { usePackageData } from "./hooks/usePackageData";
import { showAppNotification } from "@/lib/notifications";
import {
  DEFAULT_CAPACITY_LIMIT,
  DEFAULT_SLOT_LIMIT,
  PACKAGE_FIELD_OPTIONS,
  PackageField,
  PackageFormValues,
  AugmentedRow,
  EditContext,
  PackageRow,
  StatusFilter,
  STATUS_FILTERS,
  buildFormValuesFromRow,
  buildInformationSummary,
  parseNumericValue,
  stripCapacityFields,
  toMatchColumnValue,
} from "./utils/packageHelpers";

const SUMMARY_CARD_ACCENTS = [
  {
    border: "border-sky-500/30",
    glow: "bg-sky-500/20",
    link: "text-sky-400 hover:text-sky-300",
  },
  {
    border: "border-emerald-500/30",
    glow: "bg-emerald-500/20",
    link: "text-emerald-400 hover:text-emerald-300",
  },
  {
    border: "border-violet-500/30",
    glow: "bg-violet-500/20",
    link: "text-violet-400 hover:text-violet-300",
  },
  {
    border: "border-amber-500/30",
    glow: "bg-amber-500/20",
    link: "text-amber-400 hover:text-amber-300",
  },
] as const;

const PackageProduct: React.FC = () => {
  const {
    data: {
      templates,
      filteredRows,
      sortedRows,
      selectedPackage,
      selectedTemplate,
      packageSummaries,
      slotStats,
      showCapacityColumn,
      tableColumnCount,
      loading,
      defaultTemplateFields,
    },
    filters: { searchTerm, categoryFilter, statusFilter },
    actions: {
      setSearchTerm,
      setCategoryFilter,
      setStatusFilter,
      setRows,
      setTemplates,
      persistSlotLinkPreference,
      applySlotLinkPrefs,
    },
  } = usePackageData();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createInitialName, setCreateInitialName] = useState("");
  const [createInitialFields, setCreateInitialFields] = useState<PackageField[]>(
    PACKAGE_FIELD_OPTIONS.map((opt) => opt.value)
  );
  const [createModalMode, setCreateModalMode] = useState<"create" | "edit">(
    "create"
  );
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editContext, setEditContext] = useState<EditContext | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRow, setViewRow] = useState<AugmentedRow | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteProcessing, setDeleteProcessing] = useState(false);
  const [packagesMarkedForDeletion, setPackagesMarkedForDeletion] = useState<
    Set<string>
  >(new Set());
  const [deleteRowTarget, setDeleteRowTarget] = useState<AugmentedRow | null>(
    null
  );
  const [deleteRowProcessing, setDeleteRowProcessing] = useState(false);
  const [deleteRowError, setDeleteRowError] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const packageParam = params.get("package");
    const normalizedCategory = packageParam || "all";
    setCategoryFilter((prev) =>
      prev === normalizedCategory ? prev : normalizedCategory
    );
  }, [location.search, setCategoryFilter]);

  const handleCategorySelect = useCallback(
    (value: string) => {
      const next =
        value === "all" ? "all" : categoryFilter === value ? "all" : value;

      if (next !== categoryFilter) {
        setCategoryFilter(next);
      }

      const params = new URLSearchParams(location.search);
      if (next === "all") {
        params.delete("package");
      } else {
        params.set("package", next);
      }
      const search = params.toString();
      const nextSearch = search ? `?${search}` : "";
      if (nextSearch !== location.search) {
        navigate(
          {
            pathname: location.pathname,
            search: nextSearch,
          },
          { replace: true }
        );
      }
    },
    [
      categoryFilter,
      location.pathname,
      location.search,
      navigate,
      setCategoryFilter,
    ]
  );

  const handleCreateButtonClick = () => {
    if (selectedPackage && selectedTemplate) {
      openCreateModal({
        name: selectedPackage,
        fields: selectedTemplate.fields,
        mode: "edit",
      });
      return;
    }
    openCreateModal();
  };

  const handleAddButtonClick = () => {
    if (!selectedPackage) return;
    if (!selectedTemplate) {
      openCreateModal({
        name: selectedPackage,
        fields: defaultTemplateFields,
        mode: "create",
      });
      return;
    }
    setAddModalOpen(true);
  };

  const openCreateModal = useCallback(
    (options?: {
      name?: string;
      fields?: PackageField[];
      mode?: "create" | "edit";
    }) => {
      setCreateInitialName(options?.name ?? "");
      setCreateInitialFields(
        options?.fields && options.fields.length > 0
          ? options.fields
          : defaultTemplateFields
      );
      setCreateModalMode(options?.mode ?? "create");
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
    [handleCategorySelect, setTemplates]
  );

  const handleEditTemplateFields = useCallback(
    (packageName: string) => {
      const template =
        templates.find((tpl) => tpl.name === packageName) ?? null;
      openCreateModal({
        name: packageName,
        fields: template?.fields ?? defaultTemplateFields,
        mode: "edit",
      });
    },
    [templates, openCreateModal, defaultTemplateFields]
  );

  const resetDeleteSelection = useCallback(() => {
    setDeleteMode(false);
    setPackagesMarkedForDeletion(new Set());
  }, []);

  const togglePackageMarked = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPackagesMarkedForDeletion((prev) => {
      const next = new Set(prev);
      if (next.has(trimmed)) next.delete(trimmed);
      else next.add(trimmed);
      return next;
    });
  }, []);

  const handleConfirmDeletePackages = useCallback(async () => {
    if (packagesMarkedForDeletion.size === 0) {
      resetDeleteSelection();
      return;
    }
    setDeleteProcessing(true);
    const packages = Array.from(packagesMarkedForDeletion);
    try {
      const res = await apiFetch(`/api/package-products/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `HTTP ${res.status}`);
      }
      const data = (await res.json().catch(() => ({}))) as {
        deletedNames?: string[];
      };
      const deletedNames = Array.isArray(data.deletedNames)
        ? data.deletedNames
        : packages;

      setRows((prev) =>
        prev.filter((row) => !deletedNames.includes((row.package || "").trim()))
      );
      setTemplates((prev) =>
        prev.filter((tpl) => !deletedNames.includes(tpl.name))
      );
      if (selectedPackage && deletedNames.includes(selectedPackage)) {
        handleCategorySelect("all");
      }
    } catch (error) {
      console.error("Xóa nhóm thất bại:", error);
      showAppNotification({
        type: "error",
        title: "Lỗi xóa loại gói",
        message: `Xóa nhóm thất bại: ${
          error instanceof Error ? error.message : "Lỗi không xác định"
        }`,
      });
    } finally {
      setDeleteProcessing(false);
      resetDeleteSelection();
    }
  }, [
    packagesMarkedForDeletion,
    resetDeleteSelection,
    selectedPackage,
    handleCategorySelect,
    setRows,
    setTemplates,
  ]);

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

  const handleDeleteRow = useCallback((row: AugmentedRow) => {
    setDeleteRowError(null);
    setDeleteRowTarget(row);
  }, []);

  const closeDeleteRowModal = useCallback(() => {
    setDeleteRowProcessing(false);
    setDeleteRowError(null);
    setDeleteRowTarget(null);
  }, []);

  const confirmDeleteRow = useCallback(async () => {
    if (!deleteRowTarget || deleteRowProcessing) return;
    const targetId = deleteRowTarget.id;
    const targetName = (deleteRowTarget.package || "").trim();

    if (targetId === undefined || targetId === null) {
      setDeleteRowError("Không tìm thấy ID gói để xóa.");
      return;
    }

    setDeleteRowProcessing(true);

    const parseError = async (res: Response) => {
      const rawText = await res.text().catch(() => "");
      const cleanedMessage = rawText
        ? rawText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        : "";
      const statusLabel = res.status ? ` (HTTP ${res.status})` : "";
      const friendlyMessage =
        cleanedMessage || res.statusText || "Không thể thực hiện xóa trên máy chủ";
      throw new Error(`Không thể xóa gói${statusLabel}: ${friendlyMessage}`);
    };

    try {
      const res = await apiFetch(`/api/package-products/${targetId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        await parseError(res);
      }
      const data = (await res.json().catch(() => ({}))) as {
        deletedIds?: Array<number | string>;
        deletedNames?: string[];
      };
      console.log("Delete package product response", {
        targetId,
        targetName,
        data,
      });
      const deletedIds = new Set(
        (data.deletedIds && data.deletedIds.length
          ? data.deletedIds
          : [targetId]
        ).map((v) => String(v))
      );

      setRows((prev) =>
        prev.filter((item) => {
          const idStr =
            item.id !== undefined && item.id !== null ? String(item.id) : "__";
          return !deletedIds.has(idStr);
        })
      );
      closeDeleteRowModal();
    } catch (error) {
      console.error("Xóa gói thất bại:", error);
      setDeleteRowError(error instanceof Error ? error.message : "Lỗi không xác định");
      setDeleteRowProcessing(false);
    }
  }, [
    deleteRowProcessing,
    deleteRowTarget,
    setRows,
    setTemplates,
    selectedPackage,
    handleCategorySelect,
    closeDeleteRowModal,
    setDeleteRowError,
  ]);

  const handleAddSubmit = useCallback(
    async (values: PackageFormValues) => {
      if (!selectedTemplate) return;
      const includeAccountStorage = selectedTemplate.fields.includes("capacity");
      const includePackageInfo = selectedTemplate.fields.includes("information");
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
        importPrice: includeImport ? parseNumericValue(values.import) ?? 0 : null,
        accountUser: includeAccountStorage ? values.accountUser || null : null,
        accountPass: includeAccountStorage ? values.accountPass || null : null,
        accountMail: includeAccountStorage ? values.accountMail || null : null,
        accountNote: includeAccountStorage ? values.accountNote || null : null,
        capacity: includeAccountStorage ? capacityLimit : null,
        hasCapacityField: includeAccountStorage,
        expired: includeExpired ? values.expired || null : null,
        slotLimit,
        matchMode: toMatchColumnValue(values.slotLinkMode),
      };
      try {
        const res = await apiFetch(`/api/package-products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const created = (await res.json()) as PackageRow;
        const mergedRow = applySlotLinkPrefs({
          ...created,
          slot: slotLimit,
          slotUsed: 0,
          capacity: includeAccountStorage ? capacityLimit : created.capacity,
          information: includePackageInfo
            ? packageInfoSummary || null
            : created.information,
          match: created.match ?? toMatchColumnValue(values.slotLinkMode),
          hasCapacityField: includeAccountStorage,
        });
        setRows((prev) => [...prev, mergedRow]);
        if (created.id !== undefined && created.id !== null) {
          persistSlotLinkPreference(created.id, values.slotLinkMode);
        }
        setAddModalOpen(false);
      } catch (error) {
        console.error("Lỗi khi tạo gói sản phẩm:", error);
      }
    },
    [
      selectedTemplate,
      applySlotLinkPrefs,
      setRows,
      persistSlotLinkPreference,
    ]
  );

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
        importPrice: includeImport ? parseNumericValue(values.import) ?? 0 : null,
        expired: includeExpired ? values.expired || null : null,
        slotLimit,
        accountStorageId: accountStorageId ?? null,
        accountUser: includeAccountStorage ? values.accountUser || null : null,
        accountPass: includeAccountStorage ? values.accountPass || null : null,
        accountMail: includeAccountStorage ? values.accountMail || null : null,
        accountNote: includeAccountStorage ? values.accountNote || null : null,
        capacity: includeAccountStorage ? capacityLimit : null,
        hasCapacityField: includeAccountStorage,
        matchMode: toMatchColumnValue(values.slotLinkMode),
      };
      try {
        const res = await apiFetch(`/api/package-products/${rowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const updated = (await res.json()) as PackageRow;
        const mergedRow = applySlotLinkPrefs({
          ...updated,
          slot: slotLimit,
          capacity: includeAccountStorage ? capacityLimit : updated.capacity,
          information: includePackageInfo
            ? packageInfoSummary || null
            : updated.information,
          match: updated.match ?? toMatchColumnValue(values.slotLinkMode),
          hasCapacityField: includeAccountStorage,
        });
        setRows((prev) =>
          prev.map((row) => (row.id === rowId ? mergedRow : row))
        );
        persistSlotLinkPreference(rowId, values.slotLinkMode);
        closeEditModal();
      } catch (error) {
        console.error(`Cập nhật Gói Sản Phẩm ${rowId} Lỗi:`, error);
      }
    },
    [editContext, closeEditModal, applySlotLinkPrefs, setRows, persistSlotLinkPreference]
  );

  const slotCards = useMemo(
    () => [
      {
        name: "Tổng",
        value: String(slotStats.total),
        icon: CheckCircleIcon,
        accent: STAT_CARD_ACCENTS.sky,
      },
      {
        name: "Gói sắp hết",
        value: String(slotStats.low),
        icon: ExclamationTriangleIcon,
        accent: STAT_CARD_ACCENTS.amber,
      },
      {
        name: "Gói đã hết",
        value: String(slotStats.out),
        icon: ArrowDownIcon,
        accent: STAT_CARD_ACCENTS.rose,
      },
      {
        name: "Thêm hôm nay",
        value: "0",
        icon: ArrowUpIcon,
        accent: STAT_CARD_ACCENTS.emerald,
      },
    ],
    [slotStats]
  );

  return (
    <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-white">
            Quản lý Gói Sản phẩm
          </h1>
          <p className="text-sm text-white/50">
            Quản lý các loại gói sản phẩm và các gói con.
          </p>
        </div>

      <div className="rounded-[32px] glass-panel p-6 shadow-2xl border border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {slotCards.map((stat) => (
            <StatCard
              key={stat.name}
              title={stat.name}
              value={stat.value}
              icon={stat.icon}
              accent={stat.accent}
            />
          ))}
        </div>
      </div>

      <div className="glass-panel-dark rounded-3xl shadow-2xl p-6 text-white border border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Tổng quan các loại gói
            </h2>
            <p className="text-sm font-medium text-white/50 tracking-wide">
              Manage and organize your product categories
            </p>
          </div>
        </div>
        {packageSummaries.length === 0 ? (
          <p className="mt-6 text-sm text-white/70">
            Không có loại gói nào được tìm thấy.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {packageSummaries.map((summary, index) => {
              const isSelected = summary.name === selectedPackage;
              const accent =
                SUMMARY_CARD_ACCENTS[index % SUMMARY_CARD_ACCENTS.length];
              const isMarkedForDeletion = packagesMarkedForDeletion.has(
                summary.name.trim()
              );
              return (
                <div
                  key={summary.name}
                  className={`relative isolate rounded-[28px] border ${
                    accent.border
                  } bg-white/5 p-6 text-white shadow-xl backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] ${
                    isSelected
                      ? "ring-2 ring-indigo-500/50 shadow-indigo-500/20"
                      : "hover:bg-white/10 border-white/10"
                  }`}
                >
                  <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-[40px] opacity-10 ${accent.glow}`}></div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300/50">
                        Loại Gói
                      </p>
                      <h3 className="text-xl font-bold tracking-tight mt-1">
                        {summary.name}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-white/40">
                        Số lượng: {summary.total}
                      </p>
                    </div>
                    {deleteMode ? (
                      <label className="flex items-center gap-2 text-sm font-semibold text-rose-600">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-400"
                          checked={isMarkedForDeletion}
                          disabled={deleteProcessing}
                          onChange={() => togglePackageMarked(summary.name)}
                        />
                        Chọn để xóa
                      </label>
                    ) : (
                      <div className="flex flex-col items-end gap-1 text-sm font-semibold">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCategorySelect(summary.name)}
                            className={`p-2 rounded-full hover:bg-blue-50 transition ${
                              isSelected ? "text-blue-300" : "text-white/80"
                            }`}
                            title="Xem chi tiết"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleEditTemplateFields(summary.name)
                            }
                            className="p-2 rounded-full hover:bg-indigo-50 text-indigo-500 transition"
                            title="Chỉnh sửa Loại Gói"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-3 text-center transition-colors hover:bg-white/10">
                      <dt className="text-[9px] font-bold uppercase tracking-widest text-indigo-300/40">
                        Tổng
                      </dt>
                      <dd className="mt-1 text-xl font-bold text-white">
                        {summary.total}
                      </dd>
                    </div>
                    <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-3 text-center transition-colors hover:bg-amber-500/10">
                      <dt className="text-[9px] font-bold uppercase tracking-widest text-amber-500/60">
                        Sắp hết
                      </dt>
                      <dd className="mt-1 text-xl font-bold text-amber-400">
                        {summary.low}
                      </dd>
                    </div>
                    <div className="rounded-2xl border border-rose-500/10 bg-rose-500/5 p-3 text-center transition-colors hover:bg-rose-500/10">
                      <dt className="text-[9px] font-bold uppercase tracking-widest text-rose-500/60">
                        Hết
                      </dt>
                      <dd className="mt-1 text-xl font-bold text-rose-400">
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
          <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              {/* Search Group */}
              <div className="relative w-full lg:flex-1">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300 pointer-events-none z-10 opaciy-70" />
                <input
                  type="text"
                  placeholder={`Tìm kiếm trong các gói của ${selectedPackage}...`}
                  className="w-full pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
                  style={{ paddingLeft: '3.25rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filter Group */}
              <div className="flex w-full lg:w-auto gap-3 items-center">
                <div className="hidden lg:block w-px h-8 bg-white/10 mx-1"></div>
                <div className="relative w-full lg:w-[180px]">
                  <select
                    className="w-full px-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none cursor-pointer transition-all appearance-none"
                    style={{ 
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke-width=\'2\' stroke=\'%23818cf8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'m19.5 8.25-7.5 7.5-7.5-7.5\' /%3E%3C/svg%3E")', 
                      backgroundPosition: 'right 1rem center', 
                      backgroundRepeat: 'no-repeat', 
                      backgroundSize: '1.1rem', 
                      paddingRight: '2.5rem' 
                    }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  >
                    {STATUS_FILTERS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Group */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                <div className="hidden lg:block w-px h-8 bg-white/10 mx-1"></div>
                
                {!deleteMode ? (
                  <GradientButton
                    icon={TrashIcon}
                    onClick={() => {
                      setDeleteMode(true);
                      setPackagesMarkedForDeletion(new Set());
                    }}
                    disabled={deleteProcessing}
                    className="!py-2 !px-4 text-xs"
                  >
                    Xóa Loại gói
                  </GradientButton>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmDeletePackages}
                      className="flex items-center justify-center gap-1 rounded-xl bg-emerald-500/80 px-3 py-2 text-sm font-semibold text-white shadow-lg hover:bg-emerald-600 transition disabled:opacity-60"
                      disabled={deleteProcessing}
                      title="Xác nhận xóa"
                    >
                      <CheckIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={resetDeleteSelection}
                      className="flex items-center justify-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-lg hover:bg-white/20 transition disabled:opacity-60"
                      disabled={deleteProcessing}
                      title="Hủy xóa"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}

                <GradientButton icon={PlusIcon} onClick={handleCreateButtonClick} className="!py-2 !px-4 text-xs">
                  Tạo Loại Gói
                </GradientButton>

                <GradientButton
                  icon={PlusIcon}
                  onClick={handleAddButtonClick}
                  disabled={!selectedPackage}
                  className="!py-2 !px-4 text-xs"
                >
                  Thêm Gói
                </GradientButton>

                <button
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    filteredRows.length
                      ? "bg-white/5 text-white border-white/10 hover:bg-white/10"
                      : "bg-white/5 text-white/30 border-white/5 cursor-not-allowed"
                  }`}
                  disabled={!filteredRows.length}
                >
                  Xuất Excel
                </button>
              </div>
            </div>
          </div>
          
          <div className="text-xs font-medium text-indigo-300/60 flex items-center gap-2 px-4 py-1">
            <span className="opacity-70">Đang xem:</span>
            <span className="text-indigo-300">{selectedPackage}</span>
            {statusFilter !== "all" && (
              <>
                <span className="text-white/20">/</span>
                <span className="text-indigo-300">
                  {STATUS_FILTERS.find((opt) => opt.value === statusFilter)?.label}
                </span>
              </>
            )}
          </div>
          <PackageTable
            rows={sortedRows}
            loading={loading}
            showCapacityColumn={showCapacityColumn}
            tableColumnCount={tableColumnCount}
            onEdit={openEditModal}
            onView={openViewModal}
            onDelete={handleDeleteRow}
          />
        </>
      )}

      <CreatePackageModal
        open={createModalOpen}
        initialName={createInitialName}
        initialFields={createInitialFields}
        mode={createModalMode}
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
      <ConfirmModal
        isOpen={Boolean(deleteRowTarget)}
        onClose={closeDeleteRowModal}
        onConfirm={confirmDeleteRow}
        title="Xác nhận xóa gói"
        message={`Bạn có chắc muốn xóa gói "${deleteRowTarget?.package}"?`}
        secondaryMessage={deleteRowError || undefined}
        confirmLabel="OK"
        cancelLabel="Hủy"
        isSubmitting={deleteRowProcessing}
      />
    </div>
  );
};

export default PackageProduct;
