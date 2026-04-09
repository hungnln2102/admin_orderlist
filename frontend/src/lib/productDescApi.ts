import { apiFetch } from "./api";
import { normalizeErrorMessage } from "./textUtils";

export interface ProductDescription {
  id: number;
  /** id bản ghi product.desc_variant (dùng chung khi nhiều variant trỏ cùng id). */
  descVariantId?: number | null;
  productId: string;
  productName?: string | null;
  rules: string;
  rulesHtml?: string | null;
  description: string;
  descriptionHtml?: string | null;
  shortDescription?: string | null;
  imageUrl?: string | null;
  /** Ảnh gói (product) — API trả về để so với ảnh biến thể */
  packageImageUrl?: string | null;
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
  /**
   * `desc_variant`: chỉ lấy variant đã có bản ghi mô tả (INNER JOIN desc_variant).
   * Mặc định rỗng — dùng cho tab gội / merge toàn bộ variant.
   */
  scope?: "desc_variant";
}

export interface ProductDescriptionSavePayload {
  /** Mã hiển thị variant; bỏ trống khi chỉ cập nhật theo descVariantId (chưa gắn variant). */
  productId?: string;
  /** Gán variant sang desc_variant có sẵn (dùng chung nội dung); bỏ qua cập nhật text trong request này. */
  descVariantId?: number | null;
  rules?: string;
  description?: string;
  shortDesc?: string;
  imageUrl?: string | null;
}

/** Tạo bản ghi desc_variant; không truyền productId => chỉ INSERT, nối variant sau. */
export type CreateProductDescriptionPayload = {
  productId?: string;
  rules?: string;
  description?: string;
  shortDesc?: string;
};

export interface ProductSeoAuditPayload {
  shortDesc?: string;
  rulesHtml?: string;
  descriptionHtml?: string;
}

export interface ProductSeoAuditCheck {
  label: string;
  detail: string;
  ready: boolean;
  weight: number;
}

export interface ProductSeoAuditResult {
  source: "website-render";
  passThreshold: number;
  checks: ProductSeoAuditCheck[];
  score: number;
  level: "critical" | "warning" | "good" | "excellent";
  readyCount: number;
  heading: string;
  slug: string;
  shortDescription: string;
  descriptionPlainText: string;
  rulesPlainText: string;
  titlePreview: string;
  metaPreview: string;
  imageAlt: string;
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

const normalizeSavedProductDescription = (
  data: Record<string, unknown>
): ProductDescription => ({
  id: Number((data as any).id) || 0,
  descVariantId: (() => {
    const v =
      (data as any).descVariantId ?? (data as any).desc_variant_id ?? null;
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  })(),
  productId: (data as any).productId || (data as any).product_id || "",
  productName:
    (data as any).productName ?? (data as any).product_name ?? null,
  rules: (data as any).rules || "",
  rulesHtml: (data as any).rulesHtml || (data as any).rules || "",
  description: (data as any).description || "",
  descriptionHtml:
    (data as any).descriptionHtml || (data as any).description || "",
  shortDescription:
    (data as any).shortDescription ??
    (data as any).shortDesc ??
    (data as any).short_desc ??
    null,
  imageUrl: (data as any).imageUrl ?? (data as any).image_url ?? null,
  packageImageUrl:
    (data as any).packageImageUrl ?? (data as any).package_image_url ?? null,
});

export const createProductDescription = async (
  payload: CreateProductDescriptionPayload
): Promise<ProductDescription> => {
  const trimmedPid = payload.productId?.trim();
  const response = await apiFetch("/api/product-descriptions/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(trimmedPid ? { productId: trimmedPid } : {}),
      rules: payload.rules ?? "",
      description: payload.description ?? "",
      shortDesc: payload.shortDesc ?? "",
    }),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      normalizeErrorMessage(message, {
        fallback: "Không thể tạo desc_variant.",
      })
    );
  }
  const data = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!data || typeof data !== "object") {
    throw new Error("Phản hồi không hợp lệ từ server.");
  }
  return normalizeSavedProductDescription(data);
};

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
  return normalizeSavedProductDescription(data as Record<string, unknown>);
};

export const deleteProductDescriptionRecord = async (
  descVariantId: number
): Promise<void> => {
  const id = Number(descVariantId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("ID desc_variant không hợp lệ.");
  }
  const response = await apiFetch(
    `/api/product-descriptions/desc-variant/${encodeURIComponent(String(id))}`,
    { method: "DELETE" }
  );
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      normalizeErrorMessage(message, {
        fallback: "Không thể xóa desc_variant.",
      })
    );
  }
};

export const auditProductSeo = async (
  payload: ProductSeoAuditPayload,
  signal?: AbortSignal
): Promise<ProductSeoAuditResult> => {
  const response = await apiFetch("/api/product-descriptions/seo-audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) {
    const jsonPayload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;
    const message =
      jsonPayload?.error ||
      jsonPayload?.message ||
      (await response.text().catch(() => ""));
    throw new Error(
      normalizeErrorMessage(message, {
        fallback: "Không thể audit SEO từ Website.",
      })
    );
  }
  const body = (await response.json().catch(() => null)) as
    | { data?: ProductSeoAuditResult }
    | ProductSeoAuditResult
    | null;
  const data =
    body && typeof body === "object" && "data" in body ? body.data : body;

  if (!data || typeof data !== "object") {
    throw new Error("Phản hồi SEO audit không hợp lệ.");
  }

  return data as ProductSeoAuditResult;
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
  if (params.scope === "desc_variant") {
    searchParams.set("scope", "desc_variant");
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
  const normalizedItems = data.items.map((item: any) => ({
    id: Number(item?.id) || 0,
    descVariantId: (() => {
      const raw =
        item?.descVariantId ?? item?.desc_variant_id ?? null;
      if (raw === null || raw === "") return null;
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return null;
      return n;
    })(),
    productId: item?.productId || item?.product_id || "",
    productName: item?.productName ?? item?.product_name ?? null,
    rules: item?.rules || "",
    rulesHtml: item?.rulesHtml || item?.rules_html || item?.rules || "",
    description: item?.description || "",
    descriptionHtml:
      item?.descriptionHtml ||
      item?.description_html ||
      item?.description ||
      "",
    shortDescription:
      item?.shortDescription ??
      item?.shortDesc ??
      item?.short_desc ??
      null,
    imageUrl: item?.imageUrl ?? item?.image_url ?? null,
    packageImageUrl:
      item?.packageImageUrl ?? item?.package_image_url ?? null,
  }));
  return {
    ...data,
    items: normalizedItems,
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
