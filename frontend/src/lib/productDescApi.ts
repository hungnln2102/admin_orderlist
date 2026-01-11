import { apiFetch } from "./api";
import { normalizeErrorMessage } from "./textUtils";

export interface ProductDescription {
  id: number;
  productId: string;
  productName?: string | null;
  rules: string;
  rulesHtml?: string | null;
  description: string;
  descriptionHtml?: string | null;
  imageUrl?: string | null;
}

export interface ProductDescriptionResponse {
  items: ProductDescription[];
  count: number;
  total?: number;
  offset?: number;
  limit?: number;
}

export interface ProductDescriptionQuery {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ProductDescriptionSavePayload {
  productId: string;
  rules?: string;
  description?: string;
  imageUrl?: string | null;
}

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

export const saveProductDescription = async (
  payload: ProductDescriptionSavePayload
): Promise<ProductDescription> => {
  const response = await apiFetch("/api/product-descriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      normalizeErrorMessage(message, {
        fallback: "Không thể lưu product_desc.",
      })
    );
  }
  const data = (await response.json().catch(() => null)) as
    | ProductDescription
    | null;
  if (!data || typeof data !== "object") {
    throw new Error("Phản hồi không hợp lệ từ server.");
  }
  return {
    id: Number((data as any).id) || 0,
    productId: (data as any).productId || "",
    productName: (data as any).productName ?? null,
    rules: (data as any).rules || "",
    rulesHtml: (data as any).rulesHtml || (data as any).rules || "",
    description: (data as any).description || "",
    descriptionHtml:
      (data as any).descriptionHtml || (data as any).description || "",
    imageUrl: (data as any).imageUrl ?? null,
  };
};

export const uploadProductImage = async (
  file: File
): Promise<ProductImageUploadResponse> => {
  const body = new FormData();
  body.append("image", file);
  const response = await apiFetch("/api/product-descriptions/upload-image", {
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
  const response = await apiFetch("/api/product-descriptions/images");
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
  const response = await apiFetch(
    `/api/product-descriptions/images/${encoded}`,
    {
      method: "DELETE",
    }
  );
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      normalizeErrorMessage(message, {
        fallback: "Delete failed.",
      })
    );
  }
};

export const fetchProductDescriptions = async (
  params: ProductDescriptionQuery = {}
): Promise<ProductDescriptionResponse> => {
  const searchParams = new URLSearchParams();
  if (params.search) {
    searchParams.set("search", params.search);
  }
  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    searchParams.set("offset", String(params.offset));
  }
  const qs = searchParams.toString();
  const response = await apiFetch(
    `/api/product-descriptions${qs ? `?${qs}` : ""}`
  );
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      normalizeErrorMessage(message, {
        fallback: "Không thể tải thông tin sản phẩm.",
      })
    );
  }
  const data = (await response.json().catch(() => null)) as
    | ProductDescriptionResponse
    | null;
  if (!data || !Array.isArray(data.items)) {
    return {
      items: [],
      count: 0,
      total: 0,
      offset: 0,
      limit: params.limit,
    };
  }
  const normalizedCount =
    typeof data.count === "number" && Number.isFinite(data.count)
      ? data.count
      : data.items.length;
  const normalizedTotal =
    typeof data.total === "number" && Number.isFinite(data.total)
      ? data.total
      : normalizedCount;
  return {
    ...data,
    count: normalizedCount,
    total: normalizedTotal,
    offset:
      typeof data.offset === "number" && Number.isFinite(data.offset)
        ? data.offset
        : params.offset ?? 0,
    limit:
      typeof data.limit === "number" && Number.isFinite(data.limit)
        ? data.limit
        : params.limit ?? data.items.length,
  };
};
