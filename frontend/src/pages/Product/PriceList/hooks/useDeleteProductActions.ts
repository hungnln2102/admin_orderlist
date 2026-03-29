import { useCallback, useState } from "react";
import type React from "react";
import { deleteProductPrice } from "../../../../lib/productPricesApi";
import type { DeleteProductState, ProductPricingRow } from "../types";
import { createDeleteProductState } from "./productActionHelpers";

interface UseDeleteProductActionsParams {
  setProductPrices: React.Dispatch<React.SetStateAction<ProductPricingRow[]>>;
  setStatusOverrides: React.Dispatch<
    React.SetStateAction<Record<number, boolean>>
  >;
  setUpdatedTimestampMap: React.Dispatch<
    React.SetStateAction<Record<number, string>>
  >;
}

export function useDeleteProductActions({
  setProductPrices,
  setStatusOverrides,
  setUpdatedTimestampMap,
}: UseDeleteProductActionsParams) {
  const [deleteProductState, setDeleteProductState] = useState<DeleteProductState>(
    createDeleteProductState()
  );

  const handleRequestDeleteProduct = useCallback(
    (
      event: React.MouseEvent<HTMLButtonElement>,
      product: ProductPricingRow
    ) => {
      event.stopPropagation();
      setDeleteProductState(createDeleteProductState(product));
    },
    []
  );

  const closeDeleteProductModal = useCallback(() => {
    setDeleteProductState(createDeleteProductState());
  }, []);

  const confirmDeleteProduct = useCallback(async () => {
    const product = deleteProductState.product;
    if (!product) return;

    setDeleteProductState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await deleteProductPrice(product.id);
      if (!response.success) {
        throw new Error(response.message || "Không thể xóa sản phẩm.");
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

  return {
    deleteProductState,
    handleRequestDeleteProduct,
    closeDeleteProductModal,
    confirmDeleteProduct,
  };
}
