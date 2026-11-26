export type WebsiteProductsTab = "descriptions" | "images";

export type VariantStatusFilter = "all" | "active" | "inactive";
export type EditorialStatus = "draft" | "in_review" | "changes_requested" | "published";
export type EditorialStatusFilter = "all" | "unstarted" | EditorialStatus;
export type EditorialAction = "submit" | "request_changes" | "publish" | "restore";

export interface EditorialRevision {
  id: number;
  html: string;
  action: string;
  createdAt: string;
  actor: string | number | null;
  note?: string | null;
}

export interface VariantEditorial {
  draft: { html: string; version: number; status: EditorialStatus; note: string | null };
  published: { html: string; version: number } | null;
  history: EditorialRevision[];
  canPublish: boolean;
}

export interface WebsiteVariant {
  id: number;
  san_pham: string;
  package_product: string;
  parent_package_name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  updated_at: string | null;
  editorial_status?: EditorialStatus | null;
  editorial_version?: number | null;
  published_version?: number | null;
  editorial_updated_at?: string | null;
  published_at?: string | null;
}

export interface VariantCounts {
  total: number;
  active: number;
  inactive: number;
}

export interface VariantListResponse {
  data: WebsiteVariant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts: VariantCounts;
}

export interface ProductImage {
  key: string;
  url: string;
  size: number;
  lastModified: string | null;
}

export type CacheStatus = "purged" | "not_configured" | "purge_failed";

export type ImageAction =
  | { type: "upload" }
  | { type: "replace" | "delete"; image: ProductImage };

export type ImageFormatFilter = "all" | "jpg" | "png" | "webp";

export type ImageSortOption = "newest" | "name_asc" | "size_desc";
