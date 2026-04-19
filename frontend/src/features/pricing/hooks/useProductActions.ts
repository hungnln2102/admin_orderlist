import { useMemo, useState } from "react";
import type React from "react";
import { apiFetch } from "@/lib/api";
import { API_ENDPOINTS } from "@/constants";
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
import { convertAmountToVnd } from "../services/exchangeRateService";
import { useDeleteProductActions } from "./useDeleteProductActions";
import { useProductReferenceOptions } from "./useProductReferenceOptions";
import { useProductStatusActions } from "./useProductStatusActions";

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
  const normalizeBasePriceInputByCurrency = (
    rawValue: string,
    currency: ProductEditFormState["basePriceCurrency"]
  ): string => {
    if (currency === "VND") return formatVndInput(rawValue);
    return String(rawValue ?? "")
      .replace(/[^\d.,]/g, "")
      .replace(/,/g, ".");
  };

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
    setProductEditForm((prev) => {
      if (!prev) return prev;

      if (field === "basePrice") {
        return {
          ...prev,
          basePrice: normalizeBasePriceInputByCurrency(
            value,
            prev.basePriceCurrency
          ),
        };
      }

      if (field === "basePriceCurrency") {
        const nextCurrency = (value ||
          "VND") as ProductEditFormState["basePriceCurrency"];
        return {
          ...prev,
          basePriceCurrency: nextCurrency,
          basePrice: normalizeBasePriceInputByCurrency(prev.basePrice, nextCurrency),
        };
      }

      return { ...prev, [field]: value };
    });
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
      let resolvedBasePrice = validation.nextBasePrice;
      if (resolvedBasePrice && resolvedBasePrice > 0) {
        const conversion = await convertAmountToVnd(
          resolvedBasePrice,
          productEditForm.basePriceCurrency
        );
        resolvedBasePrice = conversion.convertedAmount;
      }

      const response = await apiFetch(
        API_ENDPOINTS.PRODUCT_PRICE_DETAIL(editingProductId),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            packageName: validation.normalizedPackageName,
            packageProduct: validation.normalizedPackageProduct,
            sanPham: validation.normalizedSanPham,
            basePrice: resolvedBasePrice,
            pctCtv: validation.nextPctCtv,
            pctKhach: validation.nextPctKhach,
            pctPromo: validation.nextPctPromo,
            pctStu: validation.nextPctStu,
          }),
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
    const nextValue = field === "basePrice" ? formatVndInput(value) : value;
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
    const validation = validateCreateProductForm(createForm, createSuppliers);
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
    editingProductId,
    productEditForm,
    productEditError,
    isSavingProductEdit,
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
