import { apiFetch } from "./client";
import { normalizeErrorMessage } from "../../lib/textUtils";

export interface ImageUploadResponse {
  url: string;
  fileName?: string;
}

export interface ImageItem {
  fileName: string;
  url: string;
}

export interface ImageListResponse {
  items: ImageItem[];
  count: number;
}

/**
 * Uploads an image to the given endpoint.
 */
export const uploadImage = async (
  file: File,
  endpoint: string
): Promise<ImageUploadResponse> => {
  const body = new FormData();
  body.append("image", file);
  
  // Note: We use apiFetch directly here because FormData doesn't work well with apiPost's JSON.stringify
  const response = await apiFetch(endpoint, {
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
  
  const data = (await response.json().catch(() => null)) as ImageUploadResponse | null;
  if (!data || typeof data.url !== "string") {
    throw new Error("Invalid upload response.");
  }
  
  return data;
};

export const fetchImages = async (endpoint: string): Promise<ImageListResponse> => {
  const response = await apiFetch(endpoint);
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      normalizeErrorMessage(message, {
        fallback: "Failed to load images.",
      })
    );
  }
  const data = (await response.json().catch(() => null)) as ImageListResponse | null;
  if (!data || !Array.isArray(data.items)) {
    return { items: [], count: 0 };
  }
  return {
    items: data.items,
    count: typeof data.count === "number" && Number.isFinite(data.count) ? data.count : data.items.length,
  };
};

export const deleteImage = async (endpoint: string, fileName: string): Promise<void> => {
  const encoded = encodeURIComponent(fileName || "");
  const response = await apiFetch(`${endpoint}/${encoded}`, {
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
