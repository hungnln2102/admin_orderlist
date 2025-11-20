
import { apiFetch } from "./api";
import { normalizeErrorMessage } from "./textUtils";

export interface ProductDeleteResponse {
  success: boolean;
  message?: string;
}

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
