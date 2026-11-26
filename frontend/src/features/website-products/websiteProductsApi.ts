import { apiClient, type ApiRequestOptions } from "@/shared/api/apiClient";
import type {
  CacheStatus,
  EditorialAction,
  EditorialStatusFilter,
  ProductImage,
  VariantEditorial,
  VariantListResponse,
  VariantStatusFilter,
} from "./types";

export const DEFAULT_VARIANT_PAGE_SIZE = 15;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const IMAGE_PATH = "/api/products/images";
const imageItemPath = (key: string) => `${IMAGE_PATH}/${encodeURIComponent(key)}`;
const editorialPath = (id: number) => `/api/products/variants/${id}/editorial`;

export class WebsiteProductsError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(
  path: string,
  fallback: string,
  options?: ApiRequestOptions
): Promise<T> {
  const response = await apiClient(path, options);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new WebsiteProductsError(typeof body?.error === "string" ? body.error : fallback, response.status);
  }
  return response.json() as Promise<T>;
}

export function listVariants(
  params: {
    page: number;
    limit: number;
    search: string;
    status: VariantStatusFilter;
    editorialStatus: EditorialStatusFilter;
    category: string;
  },
  signal: AbortSignal
) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    search: params.search,
    status: params.status,
    editorialStatus: params.editorialStatus,
  });
  if (params.category) query.set("category", params.category);
  return request<VariantListResponse>(
    `/api/products/prices?${query}`,
    "Không thể tải danh sách biến thể.",
    { signal }
  );
}

export function getVariantEditorial(id: number, signal?: AbortSignal) {
  return request<VariantEditorial>(editorialPath(id), "Không thể tải nội dung biên tập.", { signal });
}

export function saveVariantDraft(id: number, html: string, version: number) {
  return request<VariantEditorial>(editorialPath(id), "Không thể lưu bản nháp.", {
    method: "PATCH",
    body: { html, version },
  });
}

export function runEditorialAction(
  id: number,
  body: { action: EditorialAction; version: number; note?: string; revisionId?: number }
) {
  return request<VariantEditorial>(`${editorialPath(id)}/actions`, "Không thể cập nhật trạng thái biên tập.", {
    method: "POST",
    body,
  });
}

export function listImages(signal: AbortSignal) {
  return request<{ items: ProductImage[]; count: number }>(
    IMAGE_PATH,
    "Không thể tải danh sách ảnh.",
    { signal }
  );
}

export function saveImage(file: File, key?: string) {
  const body = new FormData();
  body.append("image", file);
  return request<ProductImage & { cacheStatus?: CacheStatus }>(
    key ? imageItemPath(key) : IMAGE_PATH,
    key ? "Không thể thay ảnh." : "Không thể tải ảnh lên.",
    { method: key ? "PUT" : "POST", body }
  );
}

export function deleteImage(key: string) {
  return request<{ ok: true; cacheStatus?: CacheStatus }>(
    imageItemPath(key),
    "Không thể xóa ảnh.",
    { method: "DELETE" }
  );
}
