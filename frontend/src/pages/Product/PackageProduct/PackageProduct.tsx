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
import ConfirmModal from "../../../components/modals/ConfirmModal";
import { CreatePackageModal } from "./components/Modals/CreatePackageModal";
import { PackageFormModal } from "./components/Modals/PackageFormModal";
import { PackageViewModal } from "./components/Modals/PackageViewModal";
import { usePackageData } from "./hooks/usePackageData";
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
      alert(
        `Xóa nhóm thất bại: ${
          error instanceof Error ? error.message : "Lỗi không xác định"
        }`
      );
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
      setDeleteRowError("Khong tim thay ID goi de xoa.");
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
        cleanedMessage || res.statusText || "Khong the thuc hien xoa tren may chu";
      throw new Error(`Khong the xoa goi${statusLabel}: ${friendlyMessage}`);
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
      console.error("Xoa goi that bai:", error);
      setDeleteRowError(error instanceof Error ? error.message : "Loi khong xac dinh");
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
        importPrice: includeImport ? Number(values.import || 0) || 0 : null,
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Quản lý Gói Sản phẩm
          </h1>
          <p className="mt-1 text-sm text-white/80">
            Quản lý các loại gói sản phẩm và các gói con.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap gap-3">
          {!deleteMode ? (
            <GradientButton
              icon={TrashIcon}
              onClick={() => {
                setDeleteMode(true);
                setPackagesMarkedForDeletion(new Set());
              }}
              disabled={deleteProcessing}
            >
              Xóa Loại gói
            </GradientButton>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirmDeletePackages}
                className="flex items-center justify-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600 transition disabled:opacity-60"
                disabled={deleteProcessing}
                title="Xác nhận xóa"
              >
                <CheckIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={resetDeleteSelection}
                className="flex items-center justify-center gap-1 rounded-lg bg-white/20 px-3 py-2 text-sm font-semibold text-gray-800 shadow hover:bg-gray-300 transition disabled:opacity-60"
                disabled={deleteProcessing}
                title="Hủy xóa"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          )}
          <GradientButton icon={PlusIcon} onClick={handleCreateButtonClick}>
            Tạo Loại Gói
          </GradientButton>
          <GradientButton
            icon={PlusIcon}
            onClick={handleAddButtonClick}
            disabled={!selectedPackage}
          >
            Thêm Gói
          </GradientButton>
        </div>
      </div>

      <div className="rounded-[32px] bg-gradient-to-br from-white/5 via-indigo-900/35 to-indigo-950/55 border border-white/10 p-6 shadow-[0_24px_65px_-28px_rgba(0,0,0,0.8),0_18px_42px_-26px_rgba(255,255,255,0.25)]">
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

      <div className="bg-white/10 rounded-xl shadow-sm p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Tổng quan các loại gói
            </h2>
            <p className="text-sm text-white/80">
              Chọn một loại gói để xem chi tiết hoặc xóa.
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
                  className={`relative isolate rounded-3xl border ${
                    accent.border
                  } bg-white/80 p-5 text-white shadow-[0_20px_50px_-35px_rgba(15,23,42,0.7)] backdrop-blur transition duration-200 ${
                    isSelected
                      ? "ring-2 ring-blue-400 shadow-[0_25px_65px_-35px_rgba(37,99,235,0.7)]"
                      : "hover:shadow-[0_30px_75px_-40px_rgba(15,23,42,0.55)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                        Loại Gói
                      </p>
                      <h3 className="text-lg font-semibold">
                        {summary.name}
                      </h3>
                      <p className="mt-1 text-sm text-white/80">
                        Số lượng gói: {summary.total}
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
                  <dl className="mt-5 grid grid-cols-3 gap-4 text-sm">
                    <div className="rounded-2xl border border-white/60 bg-white/70 p-3 text-center shadow-inner">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-white/70">
                        Tổng
                      </dt>
                      <dd className="mt-1 text-2xl font-bold text-white">
                        {summary.total}
                      </dd>
                    </div>
                    <div className="rounded-2xl border border-amber-100/70 bg-amber-50/60 p-3 text-center shadow-inner">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                        Sắp hết
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
                  placeholder={`Tìm kiếm trong các gói của ${selectedPackage}...`}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
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
                    ? "bg-gray-100 text-gray-800 hover:bg-indigo-50"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
                disabled={!filteredRows.length}
              >
                Xuất Excel
              </button>
            </div>
            <div className="text-sm text-white/80">
              Đang xem loại gói:{" "}
              <span className="font-medium text-white">
                {selectedPackage ?? "Tất cả"}
              </span>
              {statusFilter !== "all" && (
                <>
                  {" "}
                  ›{" "}
                  <span className="font-medium text-white">
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
        title="Xac nhan xoa goi"
        message={`Ban co chac muon xoa goi "${deleteRowTarget?.package}"?`}
        secondaryMessage={deleteRowError || undefined}
        confirmLabel="OK"
        cancelLabel="Huy"
        isSubmitting={deleteRowProcessing}
      />
    </div>
  );
};

export default PackageProduct;
