import { apiFetch } from "./api";
import { normalizeErrorMessage } from "./textUtils";

export interface VariantImageUploadResponse {
  url: string;
  fileName?: string;
}

export interface VariantImageItem {
  fileName: string;
  url: string;
}

export interface VariantImageListResponse {
  items: VariantImageItem[];
  count: number;
}

export const uploadVariantImage = async (
  file: File
): Promise<VariantImageUploadResponse> => {
  const body = new FormData();
  body.append("image", file);
  const response = await apiFetch("/api/variant-images/upload", {
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
    | VariantImageUploadResponse
    | null;
  if (!data || typeof data.url !== "string") {
    throw new Error("Invalid upload response.");
  }
  return data;
};

export const fetchVariantImages = async (): Promise<VariantImageListResponse> => {
  const response = await apiFetch("/api/variant-images");
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      normalizeErrorMessage(message, {
        fallback: "Failed to load images.",
      })
    );
  }
  const data = (await response.json().catch(() => null)) as
    | VariantImageListResponse
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

export const deleteVariantImage = async (fileName: string): Promise<void> => {
  const encoded = encodeURIComponent(fileName || "");
  const response = await apiFetch(`/api/variant-images/${encoded}`, {
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
