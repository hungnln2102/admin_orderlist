import { apiFetch } from "./api";
import { normalizeErrorMessage } from "./textUtils";

export interface ProductDeleteResponse {
  success: boolean;
  message?: string;
}

export type ProductPriceUpdatePayload = {
  packageName?: string;
  categoryIds?: number[];
  categoryColors?: Record<number, string> | Array<{ id: number; color?: string | null }>;
};

export const updateProductPrice = async (
  productId: number,
  payload: ProductPriceUpdatePayload
): Promise<any> => {
  const response = await apiFetch(`/api/product-prices/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      normalizeErrorMessage(message, {
        fallback: "Cannot update product categories.",
      })
    );
  }
  return response.json().catch(() => ({}));
};

export const deleteProductPrice = async (
  productId: number
): Promise<ProductDeleteResponse> => {
  const response = await apiFetch(`/api/product-prices/${productId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      normalizeErrorMessage(message, {
        fallback: "Không thể xóa sản phẩm khỏi bảng giá.",
        blockPatterns: [/(cannot\s+delete)/i],
      })
    );
  }
  const data = await response.json().catch(() => null);
  if (data && typeof data.success === "boolean") {
    return data;
  }
  return { success: true };
};
