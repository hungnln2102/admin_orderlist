import { useCallback, useEffect, useState } from "react";
import type React from "react";
import { deleteProductPrice } from "../../../../lib/productPricesApi";
import { API_ENDPOINTS } from "../../../../constants";
import { showAppNotification } from "@/lib/notifications";
import {
  BankOption,
  CreateProductFormState,
  CreateSupplierEntry,
  DeleteProductState,
  ProductEditFormState,
  ProductPricingRow,
  SupplierOption,
} from "../types";
import {
  MIN_PROMO_RATIO,
  createSupplierEntry,
  formatVndInput,
  mapProductPriceRow,
  parseRatioInput,
} from "../utils";

type SupplierPayload = {
  sourceId?: number;
  sourceName?: string;
  price: number | null;
  numberBank?: string;
  binBank?: string;
};

interface UseProductActionsParams {
  apiBase: string;
  productPrices: ProductPricingRow[];
  setProductPrices: React.Dispatch<React.SetStateAction<ProductPricingRow[]>>;
  fetchProductPrices: () => Promise<void>;
  statusOverrides: Record<number, boolean>;
  setStatusOverrides: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  updatedTimestampMap: Record<number, string>;
  setUpdatedTimestampMap: React.Dispatch<React.SetStateAction<Record<number, string>>>;
}

const buildProductEditForm = (
  product: ProductPricingRow
): ProductEditFormState => ({
  packageName: product.packageName || "",
  packageProduct: product.packageProduct || "",
  sanPham: product.sanPhamRaw || "",
  pctCtv:
    product.pctCtv !== null && product.pctCtv !== undefined
      ? String(product.pctCtv)
      : "",
  pctKhach:
    product.pctKhach !== null && product.pctKhach !== undefined
      ? String(product.pctKhach)
      : "",
  pctPromo:
    product.pctPromo !== null && product.pctPromo !== undefined
      ? String(product.pctPromo)
      : "",
});

export const useProductActions = ({
  apiBase,
  productPrices,
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
  const [createForm, setCreateForm] = useState<CreateProductFormState>({
    packageName: "",
    packageProduct: "",
    sanPham: "",
    pctCtv: "",
    pctKhach: "",
    pctPromo: "",
  });
  const [createSuppliers, setCreateSuppliers] = useState<CreateSupplierEntry[]>(
    [createSupplierEntry()]
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [deleteProductState, setDeleteProductState] =
    useState<DeleteProductState>({
      product: null,
      loading: false,
      error: null,
    });

  const loadBankOptions = useCallback(async () => {
    if (isLoadingBanks || bankOptions.length > 0) return;
    setIsLoadingBanks(true);
    try {
      const response = await fetch(`${apiBase}${API_ENDPOINTS.BANK_LIST}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Không thể tải danh sách ngân hàng.");
      }
      const payload = await response.json();
      const items: BankOption[] = Array.isArray(payload)
        ? payload
            .map((row: any) => ({
              bin: row?.bin?.toString().trim() ?? "",
              name: row?.bank_name?.toString().trim() ?? row?.name ?? "",
            }))
            .filter((item) => item.bin && item.name)
        : [];
      setBankOptions(items);
    } catch (err) {
      console.error("Lỗi khi tải danh sách ngân hàng:", err);
    } finally {
      setIsLoadingBanks(false);
    }
  }, [apiBase, bankOptions.length, isLoadingBanks]);

  const loadSupplierOptions = useCallback(async () => {
    if (isLoadingSuppliers || supplierOptions.length > 0) return;
    setIsLoadingSuppliers(true);
    try {
      const response = await fetch(`${apiBase}${API_ENDPOINTS.SUPPLIES}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Không thể tải danh sách NCC.");
      }
      const payload = await response.json().catch(() => null);
      const items = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
        ? payload
        : [];
      const normalized = items
        .map((item) => {
          const idRaw = item?.id ?? item?.sourceId ?? item?.source_id;
          const idValue =
            typeof idRaw === "number" && Number.isFinite(idRaw)
              ? idRaw
              : Number.isFinite(Number(idRaw))
              ? Number(idRaw)
              : null;
          const name =
            item?.supplier_name ??
            item?.source_name ??
            item?.name ??
            item?.sourceName ??
            item?.source ??
            "";
          return {
            id: idValue ?? null,
            name: (name || "").trim(),
            numberBank:
              item?.number_bank ?? item?.numberBank ?? item?.bankNumber ?? "",
            binBank: item?.bin_bank ?? item?.binBank ?? item?.bankBin ?? "",
          } as SupplierOption;
        })
        .filter((opt) => opt.name.length > 0);
      const deduped: SupplierOption[] = [];
      const seen = new Set<string>();
      for (const opt of normalized) {
        const key =
          opt.id !== null
            ? `id:${opt.id}`
            : `name:${opt.name.toLowerCase().trim()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(opt);
      }
      setSupplierOptions(deduped);
    } catch (err) {
      console.error("Lỗi khi tải danh sách NCC:", err);
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, [apiBase, isLoadingSuppliers, supplierOptions.length]);

  useEffect(() => {
    if (!isLoadingSuppliers && supplierOptions.length === 0) {
      loadSupplierOptions();
    }
  }, [isLoadingSuppliers, supplierOptions.length, loadSupplierOptions]);

  useEffect(() => {
    if (isCreateModalOpen && bankOptions.length === 0 && !isLoadingBanks) {
      loadBankOptions();
    }
    if (
      isCreateModalOpen &&
      supplierOptions.length === 0 &&
      !isLoadingSuppliers
    ) {
      loadSupplierOptions();
    }
  }, [
    isCreateModalOpen,
    bankOptions.length,
    isLoadingBanks,
    loadBankOptions,
    supplierOptions.length,
    isLoadingSuppliers,
    loadSupplierOptions,
  ]);

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
    const normalizedPackageName = productEditForm.packageName?.trim() ?? "";
    const normalizedPackageProduct =
      productEditForm.packageProduct?.trim() ?? "";
    const normalizedSanPham = productEditForm.sanPham?.trim() ?? "";

    if (!normalizedSanPham) {
      setProductEditError("Vui lòng nhập mã sản phẩm hợp lệ");
      return;
    }

    const nextPctCtv = parseRatioInput(productEditForm.pctCtv);
    const nextPctKhach = parseRatioInput(productEditForm.pctKhach);
    const nextPctPromo = parseRatioInput(productEditForm.pctPromo);

    if (!nextPctCtv || nextPctCtv <= 0) {
      setProductEditError("Tỷ giá CTV phải lớn hơn 0");
      return;
    }
    if (!nextPctKhach || nextPctKhach <= 0) {
      setProductEditError("Tỷ giá Khách phải lớn hơn 0");
      return;
    }
    if (nextPctPromo !== null) {
      if (nextPctPromo < MIN_PROMO_RATIO) {
        setProductEditError("Tỷ lệ khuyến mãi không được âm.");
        return;
      }
      const promoHeadroom = Math.max(0, nextPctKhach - 1);
      if (promoHeadroom === 0 && nextPctPromo > 0) {
        setProductEditError(
          "Tỷ giá khuyến mãi không áp dụng khi Tỷ giá Khách ở mức 1."
        );
        return;
      }
      if (nextPctPromo > promoHeadroom) {
        setProductEditError(
          `Tỷ lệ khuyến mãi không được vượt ${promoHeadroom.toFixed(2)}`
        );
        return;
      }
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
            packageName: normalizedPackageName,
            packageProduct: normalizedPackageProduct,
            sanPham: normalizedSanPham,
            pctCtv: nextPctCtv,
            pctKhach: nextPctKhach,
            pctPromo: nextPctPromo,
          }),
          credentials: "include",
        }
      );
      const rawBody = await response.text();
      let payload: any = null;
      if (rawBody) {
        try {
          payload = JSON.parse(rawBody);
        } catch {
          payload = null;
        }
      }
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

  const handleRequestDeleteProduct = useCallback(
    (
      event: React.MouseEvent<HTMLButtonElement>,
      product: ProductPricingRow
    ) => {
      event.stopPropagation();
      setDeleteProductState({
        product,
        loading: false,
        error: null,
      });
    },
    []
  );

  const closeDeleteProductModal = useCallback(() => {
    setDeleteProductState({
      product: null,
      loading: false,
      error: null,
    });
  }, []);

  const confirmDeleteProduct = useCallback(async () => {
    const product = deleteProductState.product;
    if (!product) return;
    setDeleteProductState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await deleteProductPrice(product.id);
      if (!response.success) {
        throw new Error(response.message || 'Không thể xóa sản phẩm.');
      }
      setProductPrices((prev) => prev.filter((row) => row.id !== product.id));
      setStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      setUpdatedTimestampMap((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      closeDeleteProductModal();
    } catch (err) {
      console.error("Failed to delete product price:", err);
      setDeleteProductState((prev) => ({
        ...prev,
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : "Không thể xóa sản phẩm. Vui lòng thử lại.",
      }));
    }
  }, [
    closeDeleteProductModal,
    deleteProductState.product,
    setProductPrices,
    setStatusOverrides,
    setUpdatedTimestampMap,
  ]);

  const resetCreateState = () => {
    setCreateForm({
      packageName: "",
      packageProduct: "",
      sanPham: "",
      pctCtv: "",
      pctKhach: "",
      pctPromo: "",
    });
    setCreateSuppliers([createSupplierEntry()]);
    setCreateError(null);
    setIsSubmittingCreate(false);
  };

  const handleOpenCreateModal = () => {
    resetCreateState();
    setIsCreateModalOpen(true);
    if (bankOptions.length === 0 && !isLoadingBanks) {
      loadBankOptions();
    }
    if (supplierOptions.length === 0 && !isLoadingSuppliers) {
      loadSupplierOptions();
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
          ? {
              ...entry,
              [field]:
                field === "sourceId"
                  ? value
                    ? Number(value) || null
                    : null
                  : field === "useCustomName"
                  ? value === "true"
                  : value,
            }
          : entry
      )
    );
  };

  const handleSupplierSelectChange = (
    supplierId: string,
    optionValue: string
  ) => {
    const selected =
      supplierOptions.find(
        (opt) =>
          (opt.id !== null && optionValue === String(opt.id)) ||
          (opt.id === null && optionValue === opt.name)
      ) || null;

    setCreateSuppliers((prev) =>
      prev.map((entry) =>
        entry.id === supplierId
          ? {
              ...entry,
              sourceId: selected?.id ?? null,
              sourceName: selected?.name ?? "",
              numberBank: selected?.numberBank ?? "",
              bankBin: selected?.binBank ?? "",
              useCustomName: false,
            }
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
        entry.id === supplierId
          ? {
              ...entry,
              sourceId: null,
              sourceName: "",
              numberBank: "",
              bankBin: "",
              useCustomName: true,
            }
          : entry
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
    const trimmedPackage = createForm.packageName.trim();
    const trimmedProduct = createForm.packageProduct.trim();
    const trimmedSanPham = createForm.sanPham.trim();
    const pctCtvValue = parseRatioInput(createForm.pctCtv);
    const pctKhachValue = parseRatioInput(createForm.pctKhach);
    const pctPromoValue = parseRatioInput(createForm.pctPromo);

    if (!trimmedSanPham) {
      setCreateError("Vui lòng nhập mã sản phẩm");
      return;
    }
    if (pctCtvValue !== null && pctCtvValue <= 0) {
      setCreateError("Tỷ giá CTV phải lớn hơn 0.");
      return;
    }
    if (pctKhachValue !== null && pctKhachValue <= 0) {
      setCreateError("Tỷ giá khách phải lớn hơn 0.");
      return;
    }
    if (pctPromoValue !== null) {
      if (pctPromoValue < MIN_PROMO_RATIO) {
        setCreateError("Tỷ lệ khuyến mãi không được âm.");
        return;
      }
      if (pctKhachValue !== null && pctKhachValue > 0) {
        const promoHeadroom = Math.max(0, pctKhachValue - 1);
        if (promoHeadroom === 0 && pctPromoValue > 0) {
          setCreateError(
            "Tỷ giá khuyến mãi không áp dụng khi Tỷ giá Khách ở mức 1."
          );
          return;
        }
        if (pctPromoValue > promoHeadroom) {
          setCreateError(
            `Tỷ lệ khuyến mãi không được vượt ${promoHeadroom.toFixed(2)}`
          );
          return;
        }
      }
    }
    const normalizedSuppliers = createSuppliers
      .map<SupplierPayload | null>((entry) => {
        const name = entry.sourceName.trim();
        const numericPrice = Number((entry.price || "").replace(/\D+/g, ""));
        const price =
          Number.isFinite(numericPrice) && numericPrice > 0 ? numericPrice : null;
        if (!name && price === null) return null;
        return {
          sourceId:
            entry.sourceId !== null && Number.isFinite(entry.sourceId)
              ? entry.sourceId
              : undefined,
          sourceName: name || undefined,
          price,
          numberBank: entry.numberBank.trim() || undefined,
          binBank: entry.bankBin.trim() || undefined,
        };
      })
      .filter(
        (entry): entry is SupplierPayload =>
          Boolean(entry && (entry.sourceId !== undefined || entry.sourceName))
      );
    setIsSubmittingCreate(true);
    setCreateError(null);

    try {
      const response = await fetch(`${apiBase}${API_ENDPOINTS.PRODUCT_PRICES}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageName: trimmedPackage,
          packageProduct: trimmedProduct,
          sanPham: trimmedSanPham,
          pctCtv: pctCtvValue,
          pctKhach: pctKhachValue,
          pctPromo: pctPromoValue,
          suppliers: normalizedSuppliers,
        }),
        credentials: "include",
      });
      const rawBody = await response.text();
      let payload: any = null;
      if (rawBody) {
        try {
          payload = JSON.parse(rawBody);
        } catch {
          payload = null;
        }
      }
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

  const handleToggleStatus = async (item: ProductPricingRow) => {
    const current = statusOverrides[item.id] ?? item.isActive ?? false;
    const nextStatus = !current;
    const previousOverride = statusOverrides[item.id];
    const previousUpdated = updatedTimestampMap[item.id];
    const optimisticTimestamp = new Date().toISOString();

    setStatusOverrides((prev) => ({
      ...prev,
      [item.id]: nextStatus,
    }));

    setProductPrices((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, isActive: nextStatus } : row
      )
    );

    setUpdatedTimestampMap((prev) => ({
      ...prev,
      [item.id]: optimisticTimestamp,
    }));

    try {
      const response = await fetch(
        `${apiBase}${API_ENDPOINTS.PRODUCT_PRICES}/${item.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: nextStatus,
          }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Lỗi khi cập nhật trạng thái");
      }

      const payload: {
        id: number;
        is_active: boolean;
        update?: string;
      } = await response.json();

      const serverStatus = payload?.is_active ?? nextStatus;
      const serverUpdated =
        typeof payload?.update === "string"
          ? payload.update
          : optimisticTimestamp;

      setStatusOverrides((prev) => ({
        ...prev,
        [item.id]: serverStatus,
      }));

      setProductPrices((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? { ...row, isActive: serverStatus, lastUpdated: serverUpdated }
            : row
        )
      );

      setUpdatedTimestampMap((prev) => ({
        ...prev,
        [item.id]: serverUpdated,
      }));
    } catch (err) {
      console.error("Failed to toggle product status:", err);

      setStatusOverrides((prev) => {
        const next = { ...prev };
        if (previousOverride === undefined) {
          delete next[item.id];
        } else {
          next[item.id] = previousOverride;
        }
        return next;
      });

      setProductPrices((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? {
                ...row,
                isActive: previousOverride ?? item.isActive ?? false,
              }
            : row
        )
      );

      setUpdatedTimestampMap((prev) => {
        const next = { ...prev };
        if (previousUpdated) {
          next[item.id] = previousUpdated;
        } else {
          delete next[item.id];
        }
        return next;
      });
      showAppNotification({
        type: "error",
        title: "Lỗi cập nhật trạng thái giá",
        message: "Cập nhật thất bại. Vui lòng thử lại.",
      });
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
    supplierOptions,
    isLoadingSuppliers,
    bankOptions,
    isLoadingBanks,
    deleteProductState,
    handleStartProductEdit,
    handleProductEditChange,
    handleCancelProductEdit,
    handleSubmitProductEdit,
    handleRequestDeleteProduct,
    confirmDeleteProduct,
    closeDeleteProductModal,
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
    handleToggleStatus,
  };
};
