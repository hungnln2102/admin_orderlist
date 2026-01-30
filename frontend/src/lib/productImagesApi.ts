import { apiFetch } from "./api";
import { normalizeErrorMessage } from "./textUtils";

export interface ProductImageUploadResponse {
  url: string;
  fileName?: string;
}

export interface ProductImageItem {
  fileName: string;
  url: string;
}

export interface ProductImageListResponse {
  items: ProductImageItem[];
  count: number;
}

export const uploadProductImage = async (
  file: File
): Promise<ProductImageUploadResponse> => {
  const body = new FormData();
  body.append("image", file);
  const response = await apiFetch("/api/product-images/upload", {
    method: "POST",
    body,
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      normalizeErrorMessage(message, {
        fallback: "Upload failed.",
      })
    );
  }
  const data = (await response.json().catch(() => null)) as
    | ProductImageUploadResponse
    | null;
  if (!data || typeof data.url !== "string") {
    throw new Error("Invalid upload response.");
  }
  return data;
};

export const fetchProductImages = async (): Promise<ProductImageListResponse> => {
  const response = await apiFetch("/api/product-images");
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      normalizeErrorMessage(message, {
        fallback: "Failed to load images.",
      })
    );
  }
  const data = (await response.json().catch(() => null)) as
    | ProductImageListResponse
    | null;
  if (!data || !Array.isArray(data.items)) {
    return { items: [], count: 0 };
  }
  return {
    items: data.items,
    count:
      typeof data.count === "number" && Number.isFinite(data.count)
        ? data.count
        : data.items.length,
  };
};

export const deleteProductImage = async (fileName: string): Promise<void> => {
  const encoded = encodeURIComponent(fileName || "");
  const response = await apiFetch(`/api/product-images/${encoded}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      normalizeErrorMessage(message, {
        fallback: "Delete failed.",
      })
    );
  }
};
