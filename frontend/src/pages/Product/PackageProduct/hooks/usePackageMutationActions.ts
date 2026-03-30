import { useCallback } from "react";
import type React from "react";
import { apiFetch } from "../../../../lib/api";
import { API_ENDPOINTS } from "../../../../constants";
import type { WarehouseItem } from "../../../Personal/Storage/types";
import type {
  EditContext,
  ManualWarehouseEntry,
  PackageFormValues,
  PackageRow,
  PackageTemplate,
} from "../utils/packageHelpers";
import {
  DEFAULT_SLOT_LIMIT,
  parseNumericValue,
  toMatchColumnValue,
} from "../utils/packageHelpers";

type UsePackageMutationActionsParams = {
  selectedTemplate: PackageTemplate | null;
  editContext: EditContext | null;
  applySlotLinkPrefs: (row: PackageRow) => PackageRow;
  persistSlotLinkPreference: (id: number | string, mode: "information" | "slot") => void;
  setRows: React.Dispatch<React.SetStateAction<PackageRow[]>>;
  closeAddModal: () => void;
  closeEditModal: () => void;
};

export const usePackageMutationActions = ({
  selectedTemplate,
  editContext,
  applySlotLinkPrefs,
  persistSlotLinkPreference,
  setRows,
  closeAddModal,
  closeEditModal,
}: UsePackageMutationActionsParams) => {
  const createWarehouseItem = useCallback(
    async (
      entry: ManualWarehouseEntry,
      fallbackCategory?: string
    ): Promise<number | null> => {
      if (!entry.account.trim()) return null;

      try {
        const response = await apiFetch(API_ENDPOINTS.WAREHOUSE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: entry.product_type?.trim() || fallbackCategory || "Khác",
            account: entry.account || null,
            password: entry.password || null,
            backup_email: entry.backup_email || null,
            two_fa: entry.two_fa || null,
            note: entry.note || null,
            status: "Tồn",
          }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const created = (await response.json()) as WarehouseItem;
        return created.id ?? null;
      } catch (error) {
        console.error("Lỗi khi tạo kho hàng:", error);
        return null;
      }
    },
    []
  );

  const handleAddSubmit = useCallback(
    async (values: PackageFormValues) => {
      if (!selectedTemplate) return;

      const includeSupplier = selectedTemplate.fields.includes("supplier");
      const includeImport = selectedTemplate.fields.includes("import");
      const parsedSlotLimit = parseNumericValue(values.slot);
      const slotLimit =
        parsedSlotLimit !== null && parsedSlotLimit > 0
          ? Math.floor(parsedSlotLimit)
          : DEFAULT_SLOT_LIMIT;

      let resolvedStockId = values.stockId;
      let resolvedStorageId = values.storageId;
      let resolvedSupplier = includeSupplier ? values.supplier || null : null;

      if (!resolvedStockId && values.manualStock.account.trim()) {
        resolvedStockId = await createWarehouseItem(
          values.manualStock,
          selectedTemplate.name
        );
      }
      if (!resolvedStorageId && values.manualStorage.account.trim()) {
        resolvedStorageId = await createWarehouseItem(
          values.manualStorage,
          selectedTemplate.name
        );
      }

      const payload = {
        packageId: selectedTemplate.productId ?? undefined,
        supplier: resolvedSupplier,
        importPrice: includeImport
          ? parseNumericValue(values.import) ?? 0
          : null,
        slotLimit,
        matchMode: toMatchColumnValue(values.slotLinkMode),
        stockId: resolvedStockId ?? null,
        storageId: resolvedStorageId ?? null,
        storageTotal: parseNumericValue(values.storageTotal),
      };

      try {
        const response = await apiFetch("/api/package-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const created = (await response.json()) as PackageRow;
        const mergedRow = applySlotLinkPrefs({
          ...created,
          slot: slotLimit,
          slotUsed: 0,
          match: created.match ?? toMatchColumnValue(values.slotLinkMode),
        });

        setRows((prev) => [...prev, mergedRow]);
        if (created.id !== undefined && created.id !== null) {
          persistSlotLinkPreference(created.id, values.slotLinkMode);
        }
        closeAddModal();
      } catch (error) {
        console.error("Lỗi khi tạo gói sản phẩm:", error);
      }
    },
    [
      selectedTemplate,
      createWarehouseItem,
      applySlotLinkPrefs,
      setRows,
      persistSlotLinkPreference,
      closeAddModal,
    ]
  );

  const handleEditSubmit = useCallback(
    async (values: PackageFormValues) => {
      if (!editContext) return;

      const { template, rowId } = editContext;
      const includeSupplier = template.fields.includes("supplier");
      const includeImport = template.fields.includes("import");
      const parsedSlotLimit = parseNumericValue(values.slot);
      const slotLimit =
        parsedSlotLimit !== null && parsedSlotLimit > 0
          ? Math.floor(parsedSlotLimit)
          : DEFAULT_SLOT_LIMIT;

      let resolvedStockId = values.stockId;
      let resolvedStorageId = values.storageId;
      let resolvedSupplier = includeSupplier ? values.supplier || null : null;

      if (!resolvedStockId && values.manualStock.account.trim()) {
        resolvedStockId = await createWarehouseItem(
          values.manualStock,
          template.name
        );
      }
      if (!resolvedStorageId && values.manualStorage.account.trim()) {
        resolvedStorageId = await createWarehouseItem(
          values.manualStorage,
          template.name
        );
      }

      const payload = {
        supplier: resolvedSupplier,
        importPrice: includeImport
          ? parseNumericValue(values.import) ?? 0
          : null,
        slotLimit,
        matchMode: toMatchColumnValue(values.slotLinkMode),
        stockId: resolvedStockId ?? null,
        storageId: resolvedStorageId ?? null,
        storageTotal: parseNumericValue(values.storageTotal),
      };

      try {
        const response = await apiFetch(`/api/package-products/${rowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const updated = (await response.json()) as PackageRow;
        const mergedRow = applySlotLinkPrefs({
          ...updated,
          slot: slotLimit,
          match: updated.match ?? toMatchColumnValue(values.slotLinkMode),
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
    [
      editContext,
      createWarehouseItem,
      closeEditModal,
      applySlotLinkPrefs,
      setRows,
      persistSlotLinkPreference,
    ]
  );

  return {
    handleAddSubmit,
    handleEditSubmit,
  };
};
