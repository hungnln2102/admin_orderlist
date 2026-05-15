import { useState } from "react";
import type React from "react";

import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/shared/api/client";

import type { ProductEditFormState, ProductPricingRow } from "../../types";
import { formatVndInput, mapProductPriceRow } from "../../utils";
import {
  buildProductEditForm,
  parseJsonResponseText,
  validateProductEditForm,
} from "../productActionHelpers";
import { convertAmountToVnd } from "../../services/exchangeRateService";

type UseProductEditActionsParams = {
  setProductPrices: React.Dispatch<React.SetStateAction<ProductPricingRow[]>>;
  setUpdatedTimestampMap: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  fetchProductPrices: () => Promise<void>;
};

export function useProductEditActions({
  setProductPrices,
  setUpdatedTimestampMap,
  fetchProductPrices,
}: UseProductEditActionsParams) {
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
  const [productEditForm, setProductEditForm] = useState<ProductEditFormState | null>(
    null
  );
  const [productEditError, setProductEditError] = useState<string | null>(null);
  const [isSavingProductEdit, setIsSavingProductEdit] = useState(false);

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
          basePrice: normalizeBasePriceInputByCurrency(value, prev.basePriceCurrency),
        };
      }

      if (
        field === "pctCtv" ||
        field === "pctKhach" ||
        field === "pctPromo" ||
        field === "pctStu"
      ) {
        return {
          ...prev,
          [field]: formatVndInput(value),
        };
      }

      if (field === "basePriceCurrency") {
        const nextCurrency = (value || "VND") as ProductEditFormState["basePriceCurrency"];
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

      const response = await apiFetch(API_ENDPOINTS.PRODUCT_PRICE_DETAIL(editingProductId), {
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
      });
      const rawBody = await response.text();
      const payload = parseJsonResponseText(rawBody);

      if (!response.ok) {
        const errorMessage =
          payload?.error || rawBody?.trim() || "Không thể cập nhật giá sản phẩm";
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

  return {
    editingProductId,
    productEditForm,
    productEditError,
    isSavingProductEdit,
    handleStartProductEdit,
    handleProductEditChange,
    handleCancelProductEdit,
    handleSubmitProductEdit,
  };
}
