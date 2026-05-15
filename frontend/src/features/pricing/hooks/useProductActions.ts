import { useMemo, useState } from "react";
import type React from "react";
import { apiFetch } from "@/shared/api/client";
import { API_ENDPOINTS } from "@/constants";
import type {
  CreateProductFormState,
  CreateSupplierEntry,
  ProductPricingRow,
} from "../types";
import { createSupplierEntry, formatVndInput } from "../utils";
import {
  applySelectedSupplierToEntry,
  createEmptyCreateForm,
  parseJsonResponseText,
  updateCreateSupplierEntry,
  validateCreateProductForm,
  enableCustomSupplierEntry,
} from "./productActionHelpers";
import { useDeleteProductActions } from "./useDeleteProductActions";
import { useProductReferenceOptions } from "./useProductReferenceOptions";
import { useProductStatusActions } from "./useProductStatusActions";
import { useProductEditActions } from "./use-product-actions/useProductEditActions";

interface UseProductActionsParams {
  productPrices: ProductPricingRow[];
  setProductPrices: React.Dispatch<React.SetStateAction<ProductPricingRow[]>>;
  fetchProductPrices: () => Promise<void>;
  statusOverrides: Record<number, boolean>;
  setStatusOverrides: React.Dispatch<
    React.SetStateAction<Record<number, boolean>>
  >;
  updatedTimestampMap: Record<number, string>;
  setUpdatedTimestampMap: React.Dispatch<
    React.SetStateAction<Record<number, string>>
  >;
}

export const useProductActions = ({
  productPrices,
  setProductPrices,
  fetchProductPrices,
  statusOverrides,
  setStatusOverrides,
  updatedTimestampMap,
  setUpdatedTimestampMap,
}: UseProductActionsParams) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateProductFormState>(
    createEmptyCreateForm()
  );
  const [createSuppliers, setCreateSuppliers] = useState<CreateSupplierEntry[]>(
    [createSupplierEntry()]
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const productNameOptions = useMemo(() => {
    const seen = new Set<string>();
    return productPrices
      .map((product) => (product.packageName || "").trim())
      .filter(Boolean)
      .filter((name) => {
        const key = name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) =>
        left.localeCompare(right, "vi", { sensitivity: "base" })
      );
  }, [productPrices]);

  const productPackageOptionsByName = useMemo(() => {
    const grouped = new Map<string, { displayName: string; packages: Set<string> }>();
    for (const product of productPrices) {
      const productName = String(product.packageName || "").trim();
      const packageName = String(product.packageProduct || "").trim();
      if (!productName || !packageName) continue;
      const key = productName.toLowerCase();
      if (!grouped.has(key)) {
        grouped.set(key, {
          displayName: productName,
          packages: new Set<string>(),
        });
      }
      grouped.get(key)?.packages.add(packageName);
    }

    const mapped: Record<string, string[]> = {};
    for (const entry of grouped.values()) {
      mapped[entry.displayName] = Array.from(entry.packages).sort((left, right) =>
        left.localeCompare(right, "vi", { sensitivity: "base" })
      );
    }
    return mapped;
  }, [productPrices]);

  const referenceOptions = useProductReferenceOptions({
    isCreateModalOpen,
  });
  const deleteActions = useDeleteProductActions({
    setProductPrices,
    setStatusOverrides,
    setUpdatedTimestampMap,
  });
  const statusActions = useProductStatusActions({
    statusOverrides,
    setStatusOverrides,
    updatedTimestampMap,
    setUpdatedTimestampMap,
    setProductPrices,
  });
  const editActions = useProductEditActions({
    setProductPrices,
    setUpdatedTimestampMap,
    fetchProductPrices,
  });

  const resetCreateState = () => {
    setCreateForm(createEmptyCreateForm());
    setCreateSuppliers([createSupplierEntry()]);
    setCreateError(null);
    setIsSubmittingCreate(false);
  };

  const handleOpenCreateModal = () => {
    resetCreateState();
    setIsCreateModalOpen(true);

    if (
      referenceOptions.bankOptions.length === 0 &&
      !referenceOptions.isLoadingBanks
    ) {
      referenceOptions.loadBankOptions();
    }
    if (
      referenceOptions.supplierOptions.length === 0 &&
      !referenceOptions.isLoadingSuppliers
    ) {
      referenceOptions.loadSupplierOptions();
    }
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    resetCreateState();
  };

  const handleCreateFormChange = (
    field: keyof CreateProductFormState,
    value: string
  ) => {
    const nextValue =
      field === "basePrice" ||
      field === "pctCtv" ||
      field === "pctKhach" ||
      field === "pctPromo" ||
      field === "pctStu"
        ? formatVndInput(value)
        : value;
    setCreateForm((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handleSupplierChange = (
    supplierId: string,
    field: keyof Omit<CreateSupplierEntry, "id">,
    value: string
  ) => {
    setCreateSuppliers((prev) =>
      prev.map((entry) =>
        entry.id === supplierId
          ? updateCreateSupplierEntry(entry, field, value)
          : entry
      )
    );
  };

  const handleSupplierSelectChange = (
    supplierId: string,
    optionValue: string
  ) => {
    const selected =
      referenceOptions.supplierOptions.find(
        (option) =>
          (option.id !== null && optionValue === String(option.id)) ||
          (option.id === null && optionValue === option.name)
      ) || null;

    setCreateSuppliers((prev) =>
      prev.map((entry) =>
        entry.id === supplierId
          ? applySelectedSupplierToEntry(entry, selected)
          : entry
      )
    );
  };

  const handleSupplierPriceInput = (supplierId: string, rawValue: string) => {
    const formatted = formatVndInput(rawValue);
    setCreateSuppliers((prev) =>
      prev.map((entry) =>
        entry.id === supplierId ? { ...entry, price: formatted } : entry
      )
    );
  };

  const handleEnableCustomSupplier = (supplierId: string) => {
    setCreateSuppliers((prev) =>
      prev.map((entry) =>
        entry.id === supplierId ? enableCustomSupplierEntry(entry) : entry
      )
    );
  };

  const handleAddSupplierRow = () => {
    setCreateSuppliers((prev) => [...prev, createSupplierEntry()]);
  };

  const handleRemoveSupplierRow = (supplierId: string) => {
    setCreateSuppliers((prev) =>
      prev.length === 1 ? prev : prev.filter((entry) => entry.id !== supplierId)
    );
  };

  const handleSubmitCreateProduct = async () => {
    const validation = validateCreateProductForm(
      createForm,
      createSuppliers,
      productPrices
    );
    if (!validation.ok) {
      setCreateError(validation.error);
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError(null);

    try {
      const response = await apiFetch(API_ENDPOINTS.PRODUCT_PRICES, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validation.payload),
      });
      const rawBody = await response.text();
      const payload = parseJsonResponseText(rawBody);

      if (!response.ok) {
        const errorMessage =
          payload?.error || rawBody?.trim() || "Không thể tạo sản phẩm";
        throw new Error(errorMessage);
      }

      await fetchProductPrices();
      handleCloseCreateModal();
    } catch (err) {
      console.error("Lỗi khi tạo sản phẩm:", err);
      setCreateError(
        err instanceof Error ? err.message : "Không thể tạo sản phẩm"
      );
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  return {
    editingProductId: editActions.editingProductId,
    productEditForm: editActions.productEditForm,
    productEditError: editActions.productEditError,
    isSavingProductEdit: editActions.isSavingProductEdit,
    isCreateModalOpen,
    createForm,
    createSuppliers,
    createError,
    isSubmittingCreate,
    productNameOptions,
    productPackageOptionsByName,
    supplierOptions: referenceOptions.supplierOptions,
    isLoadingSuppliers: referenceOptions.isLoadingSuppliers,
    refreshSupplierOptions: () =>
      referenceOptions.loadSupplierOptions({ force: true }),
    bankOptions: referenceOptions.bankOptions,
    isLoadingBanks: referenceOptions.isLoadingBanks,
    deleteProductState: deleteActions.deleteProductState,
    handleStartProductEdit: editActions.handleStartProductEdit,
    handleProductEditChange: editActions.handleProductEditChange,
    handleCancelProductEdit: editActions.handleCancelProductEdit,
    handleSubmitProductEdit: editActions.handleSubmitProductEdit,
    handleRequestDeleteProduct: deleteActions.handleRequestDeleteProduct,
    confirmDeleteProduct: deleteActions.confirmDeleteProduct,
    closeDeleteProductModal: deleteActions.closeDeleteProductModal,
    handleOpenCreateModal,
    handleCloseCreateModal,
    handleCreateFormChange,
    handleSupplierChange,
    handleSupplierSelectChange,
    handleSupplierPriceInput,
    handleEnableCustomSupplier,
    handleAddSupplierRow,
    handleRemoveSupplierRow,
    handleSubmitCreateProduct,
    handleToggleStatus: statusActions.handleToggleStatus,
  };
};
