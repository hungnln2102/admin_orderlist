import { useState } from "react";
import type React from "react";
import { apiFetch } from "@/lib/api";
import { API_ENDPOINTS } from "@/constants";
import type {
  NewSupplyRowState,
  ProductPricingRow,
  SupplyPriceState,
} from "../types";
import { normalizeProductKey } from "../utils";
import {
  buildAddedSupplyState,
  createEmptyNewSupplyRow,
  omitNumberKey,
  updateNewSupplyDraft,
  validateNewSupplyDraft,
} from "./supplyActionHelpers";

interface UseNewSupplyRowActionsParams {
  setSupplyPriceMap: React.Dispatch<
    React.SetStateAction<Record<string, SupplyPriceState>>
  >;
  fetchSupplyPricesForProduct: (productName: string) => Promise<void>;
  recomputeProductBasePrice: (
    productId: number,
    nextHighestPrice: number | null
  ) => void;
  refreshProductPricing: () => Promise<void>;
  refreshSupplierOptions?: () => Promise<void> | void;
}

export function useNewSupplyRowActions({
  setSupplyPriceMap,
  fetchSupplyPricesForProduct,
  recomputeProductBasePrice,
  refreshProductPricing,
  refreshSupplierOptions,
}: UseNewSupplyRowActionsParams) {
  const [newSupplyRows, setNewSupplyRows] = useState<
    Record<number, NewSupplyRowState>
  >({});

  const handleStartAddSupplierRow = (productId: number) => {
    setNewSupplyRows((prev) => {
      if (prev[productId]) return prev;
      return {
        ...prev,
        [productId]: createEmptyNewSupplyRow(),
      };
    });
  };

  const handleNewSupplierInputChange = (
    productId: number,
    field: "sourceName" | "price" | "sourceId" | "useCustomName",
    value: string | number | boolean | null
  ) => {
    setNewSupplyRows((prev) => {
      const current = prev[productId];
      if (!current) return prev;

      return {
        ...prev,
        [productId]: updateNewSupplyDraft(current, field, value),
      };
    });
  };

  const handleCancelAddSupplierRow = (productId: number) => {
    setNewSupplyRows((prev) => omitNumberKey(prev, productId));
  };

  const handleConfirmAddSupplierRow = async (product: ProductPricingRow) => {
    const current = newSupplyRows[product.id];
    if (!current) return;

    const validation = validateNewSupplyDraft(current);
    if (!validation.ok) {
      setNewSupplyRows((prev) => ({
        ...prev,
        [product.id]: {
          ...current,
          error: validation.error,
        },
      }));
      return;
    }

    setNewSupplyRows((prev) => ({
      ...prev,
      [product.id]: { ...current, isSaving: true, error: null },
    }));

    try {
      const response = await apiFetch(
        API_ENDPOINTS.CREATE_SUPPLY_PRICE(product.id),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceName: validation.trimmedName,
            sourceId: validation.resolvedSourceId,
            price: validation.parsedPrice,
          }),
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể thêm nguồn mới.");
      }

      const productKey = normalizeProductKey(product.sanPhamRaw);
      const responseSourceId = Number(payload?.sourceId);
      const resolvedSourceIdValue =
        typeof validation.resolvedSourceId === "number" &&
        Number.isFinite(validation.resolvedSourceId) &&
        validation.resolvedSourceId > 0
          ? validation.resolvedSourceId
          : null;
      const fallbackSourceId = resolvedSourceIdValue ?? Date.now();
      const finalSourceId =
        Number.isFinite(responseSourceId) && responseSourceId > 0
          ? responseSourceId
          : fallbackSourceId;
      const normalizedPrice = Number.isFinite(Number(payload?.price))
        ? Number(payload?.price)
        : validation.parsedPrice;

      let nextHighestPrice: number | null = null;
      let shouldRecomputeBase = false;

      setSupplyPriceMap((prev) => {
        const nextSupplyState = buildAddedSupplyState(
          prev[productKey],
          finalSourceId,
          validation.trimmedName,
          normalizedPrice
        );
        nextHighestPrice = nextSupplyState.nextHighestPrice;
        shouldRecomputeBase = nextSupplyState.shouldRecomputeBase;

        return {
          ...prev,
          [productKey]: nextSupplyState.nextState,
        };
      });

      if (shouldRecomputeBase) {
        recomputeProductBasePrice(product.id, nextHighestPrice);
      }

      await fetchSupplyPricesForProduct(product.sanPhamRaw);
      await Promise.resolve(refreshSupplierOptions?.());
      handleCancelAddSupplierRow(product.id);

      if (shouldRecomputeBase) {
        await refreshProductPricing();
      }
    } catch (err) {
      setNewSupplyRows((prev) => ({
        ...prev,
        [product.id]: {
          ...current,
          isSaving: false,
          error:
            err instanceof Error ? err.message : "Không thể thêm nguồn mới.",
        },
      }));
    }
  };

  return {
    newSupplyRows,
    handleStartAddSupplierRow,
    handleNewSupplierInputChange,
    handleCancelAddSupplierRow,
    handleConfirmAddSupplierRow,
  };
}
