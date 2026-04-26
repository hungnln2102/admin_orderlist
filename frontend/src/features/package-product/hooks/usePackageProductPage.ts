import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { STAT_CARD_ACCENTS } from "@/components/ui/StatCard";
import { usePackageData } from "./usePackageData";
import { usePackageDeleteActions } from "./usePackageDeleteActions";
import { usePackageMutationActions } from "./usePackageMutationActions";
import { usePackageTemplateActions } from "./usePackageTemplateActions";
import type {
  AugmentedRow,
  EditContext,
  PackageField,
} from "../utils/packageHelpers";
import { buildFormValuesFromRow } from "../utils/packageHelpers";

type OpenCreateModalOptions = {
  productId?: number | null;
  name?: string;
  fields?: PackageField[];
  mode?: "create" | "edit";
};

export const usePackageProductPage = () => {
  const {
    data: {
      rows,
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
  const [createInitialProductId, setCreateInitialProductId] = useState<
    number | null
  >(null);
  const [createInitialName, setCreateInitialName] = useState("");
  const [createInitialFields, setCreateInitialFields] = useState<PackageField[]>(
    defaultTemplateFields
  );
  const [createModalMode, setCreateModalMode] = useState<"create" | "edit">(
    "create"
  );
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editContext, setEditContext] = useState<EditContext | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRow, setViewRow] = useState<AugmentedRow | null>(null);

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

  const openCreateModal = useCallback(
    (options?: OpenCreateModalOptions) => {
      setCreateInitialProductId(options?.productId ?? null);
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

  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
  }, []);

  const handleCreateButtonClick = useCallback(() => {
    if (selectedPackage && selectedTemplate) {
      openCreateModal({
        productId: selectedTemplate.productId ?? null,
        name: selectedPackage,
        fields: selectedTemplate.fields,
        mode: "edit",
      });
      return;
    }

    openCreateModal();
  }, [openCreateModal, selectedPackage, selectedTemplate]);

  const handleAddButtonClick = useCallback(() => {
    if (!selectedPackage) return;

    if (!selectedTemplate) {
      openCreateModal({
        productId: null,
        name: selectedPackage,
        fields: defaultTemplateFields,
        mode: "create",
      });
      return;
    }

    setAddModalOpen(true);
  }, [defaultTemplateFields, openCreateModal, selectedPackage, selectedTemplate]);

  const handleEditTemplateFields = useCallback(
    (packageName: string) => {
      const template =
        templates.find((item) => item.name === packageName) ?? null;

      openCreateModal({
        productId: template?.productId ?? null,
        name: packageName,
        fields: template?.fields ?? defaultTemplateFields,
        mode: "edit",
      });
    },
    [defaultTemplateFields, openCreateModal, templates]
  );

  const closeAddModal = useCallback(() => {
    setAddModalOpen(false);
  }, []);

  const openEditModal = useCallback(
    (row: AugmentedRow) => {
      const template = templates.find((item) => item.name === row.package) ?? {
        name: row.package,
        fields: defaultTemplateFields,
        isCustom: false,
      };

      setEditContext({
        rowId: row.id,
        template,
        initialValues: buildFormValuesFromRow(row),
        stockInfo: row.stockId
          ? {
              account: row.informationUser,
              password: row.informationPass,
              backup_email: row.informationMail,
              two_fa: row.informationTwoFa,
              note: row.informationNote,
              expires_at: row.expired,
            }
          : null,
        storageInfo: row.storageId
          ? {
              account: row.accountUser,
              password: row.accountPass,
              backup_email: row.accountMail,
              two_fa: row.accountTwoFa,
              note: row.accountNote,
            }
          : null,
      });
      setEditModalOpen(true);
    },
    [defaultTemplateFields, templates]
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

  const deleteActions = usePackageDeleteActions({
    rows,
    selectedPackage,
    onResetSelectedPackage: () => handleCategorySelect("all"),
    setRows,
    setTemplates,
  });

  const { handleAddSubmit, handleEditSubmit } = usePackageMutationActions({
    selectedTemplate,
    editContext,
    applySlotLinkPrefs,
    persistSlotLinkPreference,
    setRows,
    closeAddModal,
    closeEditModal,
  });

  const { handleCreateTemplate } = usePackageTemplateActions({
    setRows,
    closeCreateModal,
    handleCategorySelect,
  });

  const usedProductIds = useMemo(
    () =>
      new Set(
        templates.map((template) => template.productId).filter((id): id is number => id != null)
      ),
    [templates]
  );

  const productHasStorage = useMemo(() => {
    if (!selectedTemplate?.productId) return false;

    return rows
      .filter((row) => row.productId === selectedTemplate.productId)
      .some((row) => row.storageTotal != null);
  }, [rows, selectedTemplate]);

  const slotCards = useMemo(
    () => [
      {
        name: "Số dòng bảng",
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

  return {
    data: {
      filteredRows,
      sortedRows,
      selectedPackage,
      selectedTemplate,
      packageSummaries,
      showCapacityColumn,
      tableColumnCount,
      loading,
      usedProductIds,
      productHasStorage,
      slotCards,
    },
    filters: {
      searchTerm,
      statusFilter,
    },
    modalState: {
      createModalOpen,
      createInitialProductId,
      createInitialName,
      createInitialFields,
      createModalMode,
      addModalOpen,
      editModalOpen,
      editContext,
      viewModalOpen,
      viewRow,
    },
    actions: {
      setSearchTerm,
      setStatusFilter,
      setCreateModalOpen,
      handleCategorySelect,
      handleCreateButtonClick,
      handleEditTemplateFields,
      handleAddButtonClick,
      openEditModal,
      openViewModal,
      closeAddModal,
      closeEditModal,
      closeViewModal,
      handleCreateTemplate,
      handleAddSubmit,
      handleEditSubmit,
    },
    deleteActions,
  };
};
