import { apiPatch } from "./api";
import { apiFetch } from "./api";
import { normalizeErrorMessage } from "./textUtils";

export interface ProductDeleteResponse {
  success: boolean;
  message?: string;
}

export type ProductPriceUpdatePayload = {
  packageName?: string | null;
  packageProduct?: string | null;
  categoryIds?: number[];
  categoryColors?: Record<number, string> | Array<{ id: number; color?: string | null }>;
  /** Ảnh gói (product.image_url) — upload qua /api/product-images */
  imageUrl?: string | null;
  /** Ảnh biến thể (variant.image_url) — upload qua /api/variant-images */
  variantImageUrl?: string | null;
};

export const updateProductPrice = (
  productId: number,
  payload: ProductPriceUpdatePayload
): Promise<Record<string, unknown>> =>
  apiPatch<Record<string, unknown>>(`/api/product-prices/${productId}`, payload || {});

export const deleteProductPrice = async (
  productId: number
): Promise<ProductDeleteResponse> => {
  // Giữ apiFetch vì cần đọc response.text() cho normalizeErrorMessage
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
