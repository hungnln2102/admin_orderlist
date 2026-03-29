import { useCallback } from "react";
import type React from "react";
import type { ProductPricingRow } from "../types";
import { applyBasePriceToProduct } from "../utils";
import { useExistingSupplyRowActions } from "./useExistingSupplyRowActions";
import { useNewSupplyRowActions } from "./useNewSupplyRowActions";
import { useSupplyPriceMap } from "./useSupplyPriceMap";

interface UseSupplyActionsParams {
  apiBase: string;
  setProductPrices: React.Dispatch<React.SetStateAction<ProductPricingRow[]>>;
  fetchProductPrices: () => Promise<void>;
}

export const useSupplyActions = ({
  apiBase,
  setProductPrices,
  fetchProductPrices,
}: UseSupplyActionsParams) => {
  const priceMapActions = useSupplyPriceMap({
    apiBase,
    setProductPrices,
  });

  const recomputeProductBasePrice = useCallback(
    (productId: number, nextHighestPrice: number | null) => {
      setProductPrices((prev) =>
        prev.map((product) =>
          product.id === productId
            ? applyBasePriceToProduct(product, nextHighestPrice)
            : product
        )
      );
    },
    [setProductPrices]
  );

  const refreshProductPricing = useCallback(async () => {
    try {
      await fetchProductPrices();
    } catch (err) {
      console.error("Failed to refresh product pricing:", err);
    }
  }, [fetchProductPrices]);

  const existingSupplyActions = useExistingSupplyRowActions({
    apiBase,
    setSupplyPriceMap: priceMapActions.setSupplyPriceMap,
    fetchSupplyPricesForProduct: priceMapActions.fetchSupplyPricesForProduct,
    recomputeProductBasePrice,
    refreshProductPricing,
  });

  const newSupplyActions = useNewSupplyRowActions({
    apiBase,
    setSupplyPriceMap: priceMapActions.setSupplyPriceMap,
    fetchSupplyPricesForProduct: priceMapActions.fetchSupplyPricesForProduct,
    recomputeProductBasePrice,
    refreshProductPricing,
  });

  return {
    supplyPriceMap: priceMapActions.supplyPriceMap,
    editingSupplyRows: existingSupplyActions.editingSupplyRows,
    supplyPriceDrafts: existingSupplyActions.supplyPriceDrafts,
    savingSupplyRows: existingSupplyActions.savingSupplyRows,
    newSupplyRows: newSupplyActions.newSupplyRows,
    fetchSupplyPricesForProduct: priceMapActions.fetchSupplyPricesForProduct,
    handleStartEditingSupply: existingSupplyActions.handleStartEditingSupply,
    handleSupplyInputChange: existingSupplyActions.handleSupplyInputChange,
    handleCancelSupplyEditing: existingSupplyActions.handleCancelSupplyEditing,
    handleConfirmSupplyEditing: existingSupplyActions.handleConfirmSupplyEditing,
    handleStartAddSupplierRow: newSupplyActions.handleStartAddSupplierRow,
    handleNewSupplierInputChange: newSupplyActions.handleNewSupplierInputChange,
    handleCancelAddSupplierRow: newSupplyActions.handleCancelAddSupplierRow,
    handleConfirmAddSupplierRow: newSupplyActions.handleConfirmAddSupplierRow,
    handleDeleteSupplyRow: existingSupplyActions.handleDeleteSupplyRow,
  };
};
