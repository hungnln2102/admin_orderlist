import { useState } from "react";
import type React from "react";
import { apiFetch } from "@/lib/api";
import { API_ENDPOINTS } from "@/constants";
import type { ProductPricingRow, SupplyPriceState } from "../types";
import {
  buildSupplyRowKey,
  formatVndDisplay,
  formatVndInput,
} from "../utils";
import {
  buildDeletedSupplyState,
  buildEditedSupplyState,
  omitStringKey,
  validateEditedSupplyDraft,
} from "./supplyActionHelpers";

interface UseExistingSupplyRowActionsParams {
  setSupplyPriceMap: React.Dispatch<
    React.SetStateAction<Record<string, SupplyPriceState>>
  >;
  fetchSupplyPricesForProduct: (productName: string) => Promise<void>;
  recomputeProductBasePrice: (
    productId: number,
    nextHighestPrice: number | null
  ) => void;
  refreshProductPricing: () => Promise<void>;
}

export function useExistingSupplyRowActions({
  setSupplyPriceMap,
  fetchSupplyPricesForProduct,
  recomputeProductBasePrice,
  refreshProductPricing,
}: UseExistingSupplyRowActionsParams) {
  const [editingSupplyRows, setEditingSupplyRows] = useState<
    Record<string, boolean>
  >({});
  const [supplyPriceDrafts, setSupplyPriceDrafts] = useState<
    Record<string, string>
  >({});
  const [savingSupplyRows, setSavingSupplyRows] = useState<
    Record<string, boolean>
  >({});
  const [supplyRowErrors, setSupplyRowErrors] = useState<
    Record<string, string | null>
  >({});

  const clearSupplyRowState = (rowKey: string) => {
    setEditingSupplyRows((prev) => omitStringKey(prev, rowKey));
    setSupplyPriceDrafts((prev) => omitStringKey(prev, rowKey));
    setSupplyRowErrors((prev) => omitStringKey(prev, rowKey));
  };

  const handleStartEditingSupply = (
    productId: number,
    sourceId: number,
    currentPrice: number | null
  ) => {
    const rowKey = buildSupplyRowKey(productId, sourceId);
    setEditingSupplyRows((prev) => ({ ...prev, [rowKey]: true }));
    setSupplyPriceDrafts((prev) => ({
      ...prev,
      [rowKey]:
        currentPrice === null || currentPrice === undefined
          ? ""
          : formatVndDisplay(currentPrice),
    }));
    setSupplyRowErrors((prev) => ({ ...prev, [rowKey]: null }));
  };

  const handleSupplyInputChange = (
    productId: number,
    sourceId: number,
    nextValue: string
  ) => {
    const rowKey = buildSupplyRowKey(productId, sourceId);
    setSupplyPriceDrafts((prev) => ({
      ...prev,
      [rowKey]: formatVndInput(nextValue),
    }));
    setSupplyRowErrors((prev) => ({ ...prev, [rowKey]: null }));
  };

  const handleCancelSupplyEditing = (productId: number, sourceId: number) => {
    const rowKey = buildSupplyRowKey(productId, sourceId);
    clearSupplyRowState(rowKey);
    setSavingSupplyRows((prev) => omitStringKey(prev, rowKey));
  };

  const handleConfirmSupplyEditing = async (
    productId: number,
    sourceId: number,
    productKey: string,
    productName: string
  ) => {
    const rowKey = buildSupplyRowKey(productId, sourceId);
    const validation = validateEditedSupplyDraft(supplyPriceDrafts[rowKey]);

    if (!validation.ok) {
      setSupplyRowErrors((prev) => ({
        ...prev,
        [rowKey]: validation.error,
      }));
      return;
    }

    setSavingSupplyRows((prev) => ({ ...prev, [rowKey]: true }));

    try {
      const response = await apiFetch(
        API_ENDPOINTS.UPDATE_SUPPLY_PRICE(productId, sourceId),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ price: validation.parsedPrice }),
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể cập nhật giá nguồn.");
      }

      const normalizedPrice = Number.isFinite(Number(payload?.price))
        ? Number(payload?.price)
        : validation.parsedPrice;

      let nextHighestPrice: number | null = null;
      let shouldRecomputeBase = false;

      setSupplyPriceMap((prev) => {
        const currentState = prev[productKey];
        if (!currentState) return prev;

        const nextSupplyState = buildEditedSupplyState(
          currentState,
          sourceId,
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
        recomputeProductBasePrice(productId, nextHighestPrice);
      }

      clearSupplyRowState(rowKey);
      await fetchSupplyPricesForProduct(productName);

      if (shouldRecomputeBase) {
        await refreshProductPricing();
      }
    } catch (err) {
      setSupplyRowErrors((prev) => ({
        ...prev,
        [rowKey]:
          err instanceof Error ? err.message : "Không thể cập nhật giá nguồn.",
      }));
    } finally {
      setSavingSupplyRows((prev) => omitStringKey(prev, rowKey));
    }
  };

  const handleDeleteSupplyRow = async (
    productId: number,
    sourceId: number,
    productKey: string,
    productName: string
  ) => {
    const rowKey = buildSupplyRowKey(productId, sourceId);
    setSupplyRowErrors((prev) => ({ ...prev, [rowKey]: null }));
    setSavingSupplyRows((prev) => ({ ...prev, [rowKey]: true }));

    let nextHighestPrice: number | null = null;
    let shouldRecomputeBase = false;

    try {
      const response = await apiFetch(
        API_ENDPOINTS.DELETE_SUPPLY_PRICE(productId, sourceId),
        {
          method: "DELETE",
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể xóa nguồn này.");
      }

      setSupplyPriceMap((prev) => {
        const currentState = prev[productKey];
        if (!currentState) return prev;

        const nextSupplyState = buildDeletedSupplyState(currentState, sourceId);
        nextHighestPrice = nextSupplyState.nextHighestPrice;
        shouldRecomputeBase = nextSupplyState.shouldRecomputeBase;

        return {
          ...prev,
          [productKey]: nextSupplyState.nextState,
        };
      });

      clearSupplyRowState(rowKey);

      if (shouldRecomputeBase) {
        recomputeProductBasePrice(productId, nextHighestPrice);
      }

      await fetchSupplyPricesForProduct(productName);

      if (shouldRecomputeBase) {
        await refreshProductPricing();
      }
    } catch (err) {
      setSupplyRowErrors((prev) => ({
        ...prev,
        [rowKey]:
          err instanceof Error ? err.message : "Không thể xóa nguồn này.",
      }));
    } finally {
      setSavingSupplyRows((prev) => omitStringKey(prev, rowKey));
    }
  };

  return {
    editingSupplyRows,
    supplyPriceDrafts,
    savingSupplyRows,
    handleStartEditingSupply,
    handleSupplyInputChange,
    handleCancelSupplyEditing,
    handleConfirmSupplyEditing,
    handleDeleteSupplyRow,
  };
}
