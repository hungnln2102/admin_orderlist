import { apiFetch } from "@/lib/api";
import { normalizeErrorMessage } from "@/lib/textUtils";
import { normalizeSavedProductDescription } from "./productDescNormalizer";
import type {
  CreateProductDescriptionPayload,
  ProductDescription,
  ProductDescriptionQuery,
  ProductDescriptionResponse,
  ProductDescriptionSavePayload,
} from "./productDescTypes";

export { auditProductSeo } from "./productDescSeoApi";
export { deleteProductImage, fetchProductImages, uploadProductImage } from "./productDescImageApi";

export type {
  CreateProductDescriptionPayload,
  ProductDescription,
  ProductDescriptionQuery,
  ProductDescriptionResponse,
  ProductDescriptionSavePayload,
  ProductImageItem,
  ProductImageListResponse,
  ProductImageUploadResponse,
  ProductSeoAuditCheck,
  ProductSeoAuditPayload,
  ProductSeoAuditResult,
} from "./productDescTypes";

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
        fallback: "Kh?ng th? t?i th?ng tin s?n ph?m.",
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
  const normalizedItems = data.items.map((item) =>
    normalizeSavedProductDescription(
      item && typeof item === "object" ? (item as Record<string, unknown>) : {}
    )
  );
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
