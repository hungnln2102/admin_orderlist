import type { ProductDescription } from "@/features/product-info/api/productDescApi";

export const PAGE_SIZE = 10;

export type CategoryItem = {
  id: number;
  name: string;
  color?: string | null;
};

export type ProductPriceItem = {
  id: number;
  /** `product.id` (bảng product) — định danh gói, dùng nhóm danh mục / đổi tên theo id */
  catalog_product_id?: number | null;
  san_pham: string;
  package_product?: string | null;
  package?: string | null;
  category?: string | null;
  categories?: CategoryItem[] | null;
  /** Ảnh biến thể (chỉ variant.image_url) */
  image_url?: string | null;
  /** Ảnh gói (chỉ product.image_url) */
  package_image_url?: string | null;
  /** Variant đang bật trên bảng giá (API: `is_active`). */
  is_active?: boolean;
  /** FK `variant.id_desc` → `desc_variant.id` (API: `desc_variant_id`). */
  desc_variant_id?: number | null;
};

export type MergedProduct = ProductDescription & {
  priceId?: number | null;
  /** `product.id` từ bảng giá (cùng cho mọi variant thuộc gói) */
  catalogProductId?: number | null;
  packageProduct?: string | null;
  packageName?: string | null;
  category?: string | null;
  categories?: CategoryItem[];
  imageUrl?: string | null;
  packageImageUrl?: string | null;
  shortDescription?: string | null;
  rulesHtml?: string | null;
  descriptionHtml?: string | null;
  /** false = không active (ẩn / không bán), lấy từ bảng giá. */
  isActive?: boolean;
};
