import { useState } from "react";
import type React from "react";
import { API_ENDPOINTS } from "../../../../constants";
import type {
  CreateProductFormState,
  CreateSupplierEntry,
  ProductEditFormState,
  ProductPricingRow,
} from "../types";
import { createSupplierEntry, formatVndInput, mapProductPriceRow } from "../utils";
import {
  applySelectedSupplierToEntry,
  buildProductEditForm,
  createEmptyCreateForm,
  parseJsonResponseText,
  updateCreateSupplierEntry,
  validateCreateProductForm,
  validateProductEditForm,
  enableCustomSupplierEntry,
} from "./productActionHelpers";
import { useDeleteProductActions } from "./useDeleteProductActions";
import { useProductReferenceOptions } from "./useProductReferenceOptions";
import { useProductStatusActions } from "./useProductStatusActions";

interface UseProductActionsParams {
  apiBase: string;
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
  apiBase,
  setProductPrices,
  fetchProductPrices,
  statusOverrides,
  setStatusOverrides,
  updatedTimestampMap,
  setUpdatedTimestampMap,
}: UseProductActionsParams) => {
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productEditForm, setProductEditForm] =
    useState<ProductEditFormState | null>(null);
  const [productEditError, setProductEditError] = useState<string | null>(null);
  const [isSavingProductEdit, setIsSavingProductEdit] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateProductFormState>(
    createEmptyCreateForm()
  );
  const [createSuppliers, setCreateSuppliers] = useState<CreateSupplierEntry[]>(
    [createSupplierEntry()]
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const referenceOptions = useProductReferenceOptions({
    apiBase,
    isCreateModalOpen,
  });
  const deleteActions = useDeleteProductActions({
    setProductPrices,
    setStatusOverrides,
    setUpdatedTimestampMap,
  });
  const statusActions = useProductStatusActions({
    apiBase,
    statusOverrides,
    setStatusOverrides,
    updatedTimestampMap,
    setUpdatedTimestampMap,
    setProductPrices,
  });

  const handleStartProductEdit = (
    event: React.MouseEvent<HTMLButtonElement>,
    product: ProductPricingRow
  ) => {
    event.stopPropagation();
    setIsSavingProductEdit(false);

    if (editingProductId === product.id) {
      setEditingProductId(null);
      setProductEditForm(null);
      setProductEditError(null);
      return;
    }

    setProductEditError(null);
    setEditingProductId(product.id);
    setProductEditForm(buildProductEditForm(product));
  };

  const handleProductEditChange = (
    field: keyof ProductEditFormState,
    value: string
  ) => {
    setProductEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleCancelProductEdit = () => {
    setEditingProductId(null);
    setProductEditForm(null);
    setProductEditError(null);
    setIsSavingProductEdit(false);
  };

  const handleSubmitProductEdit = async () => {
    if (!productEditForm || editingProductId === null) return;

    const validation = validateProductEditForm(productEditForm);
    if (!validation.ok) {
      setProductEditError(validation.error);
      return;
    }

    setIsSavingProductEdit(true);
    setProductEditError(null);

    try {
      const response = await fetch(
        `${apiBase}${API_ENDPOINTS.PRODUCT_PRICE_DETAIL(editingProductId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            packageName: validation.normalizedPackageName,
            packageProduct: validation.normalizedPackageProduct,
            sanPham: validation.normalizedSanPham,
            pctCtv: validation.nextPctCtv,
            pctKhach: validation.nextPctKhach,
            pctPromo: validation.nextPctPromo,
          }),
          credentials: "include",
        }
      );
      const rawBody = await response.text();
      const payload = parseJsonResponseText(rawBody);

      if (!response.ok) {
        const errorMessage =
          payload?.error ||
          rawBody?.trim() ||
          "Không thể cập nhật giá sản phẩm";
        throw new Error(errorMessage);
      }

      const updatedRow = mapProductPriceRow(payload, editingProductId);
      setProductPrices((prev) =>
        prev.map((row) => (row.id === editingProductId ? updatedRow : row))
      );

      if (updatedRow?.id !== undefined) {
        setUpdatedTimestampMap((prev) => ({
          ...prev,
          [updatedRow.id]: updatedRow.lastUpdated || new Date().toISOString(),
        }));
      }

      await fetchProductPrices();
      setEditingProductId(null);
      setProductEditForm(null);
    } catch (err) {
      console.error("Lỗi khi cập nhật giá sản phẩm:", err);
      setProductEditError(
        err instanceof Error ? err.message : "Không thể cập nhật giá sản phẩm"
      );
    } finally {
      setIsSavingProductEdit(false);
    }
  };

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
    setCreateForm((prev) => ({ ...prev, [field]: value }));
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
    const validation = validateCreateProductForm(createForm, createSuppliers);
    if (!validation.ok) {
      setCreateError(validation.error);
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError(null);

    try {
      const response = await fetch(`${apiBase}${API_ENDPOINTS.PRODUCT_PRICES}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validation.payload),
        credentials: "include",
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
    editingProductId,
    productEditForm,
    productEditError,
    isSavingProductEdit,
    isCreateModalOpen,
    createForm,
    createSuppliers,
    createError,
    isSubmittingCreate,
    supplierOptions: referenceOptions.supplierOptions,
    isLoadingSuppliers: referenceOptions.isLoadingSuppliers,
    bankOptions: referenceOptions.bankOptions,
    isLoadingBanks: referenceOptions.isLoadingBanks,
    deleteProductState: deleteActions.deleteProductState,
    handleStartProductEdit,
    handleProductEditChange,
    handleCancelProductEdit,
    handleSubmitProductEdit,
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
