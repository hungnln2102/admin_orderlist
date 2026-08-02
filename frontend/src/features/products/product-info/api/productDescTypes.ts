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

