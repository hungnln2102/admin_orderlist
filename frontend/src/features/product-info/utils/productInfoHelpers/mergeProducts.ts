import type { ProductDescription } from "@/features/product-info/api/productDescApi";
import {
  normalizeProductKey,
  normalizeVariantActive,
  toHtmlFromPlain,
} from "./basic";
import type { MergedProduct, ProductPriceItem } from "./types";
import { variantListSortRank } from "./variantStatus";

const pickDescVariantId = (
  fromVariantTable: unknown,
  fromDescApi: unknown
): number | null => {
  const n = (v: unknown) => {
    if (v == null || v === "") return null;
    const x = Number(v);
    return Number.isFinite(x) && x > 0 ? x : null;
  };
  return n(fromVariantTable) ?? n(fromDescApi);
};

/**
 * Gộp dữ liệu: nguồn từ product_desc + bảng giá.
 * Không lọc trùng: mọi dòng từ product_desc đều giữ nguyên, bổ sung thêm dòng chỉ có ở bảng giá.
 */
export const mergeProducts = (
  productDescs: ProductDescription[],
  productPriceList: ProductPriceItem[],
  searchTerm: string
): MergedProduct[] => {
  const search = (searchTerm || "").toLowerCase().trim();
  const priceMap = new Map<string, ProductPriceItem>();
  productPriceList.forEach((item) => {
    const sanKey = normalizeProductKey(item.san_pham || "");
    const packageKey = normalizeProductKey(item.package_product || "");
    const keys = [sanKey, packageKey].filter(Boolean) as string[];
    keys.forEach((key) => {
      if (!priceMap.has(key)) {
        priceMap.set(key, item);
      }
    });
  });

  const merged: MergedProduct[] = [];
  const descKeys = new Set<string>();

  for (const item of productDescs) {
    const normalizedId = normalizeProductKey(item.productId || "");
    if (normalizedId) descKeys.add(normalizedId);
    const priceRow = normalizedId ? priceMap.get(normalizedId) : null;
    merged.push({
      ...item,
      priceId: priceRow?.id ?? null,
      catalogProductId: priceRow?.catalog_product_id ?? null,
      productId: item.productId || "",
      productName:
        item.productName ||
        (priceRow ? (priceRow.package_product || priceRow.san_pham || "") : null) ||
        item.productId,
      packageProduct: priceRow ? (priceRow.package_product || priceRow.san_pham || "") : null,
      packageName: priceRow ? (priceRow.package || priceRow.san_pham || "") : null,
      category: priceRow?.category ?? null,
      categories: Array.isArray(priceRow?.categories) ? priceRow?.categories ?? [] : [],
      imageUrl:
        (item.imageUrl && String(item.imageUrl).trim()) ||
        (priceRow?.image_url && String(priceRow.image_url).trim()) ||
        null,
      packageImageUrl:
        item.packageImageUrl ??
        (item as { package_image_url?: string | null }).package_image_url ??
        priceRow?.package_image_url ??
        null,
      shortDescription: item.shortDescription || null,
      rulesHtml: item.rulesHtml || toHtmlFromPlain(item.rules || ""),
      descriptionHtml:
        item.descriptionHtml || toHtmlFromPlain(item.description || ""),
      descVariantId: pickDescVariantId(
        priceRow?.desc_variant_id,
        item.descVariantId
      ),
      isActive: normalizeVariantActive(priceRow?.is_active, true),
    });
  }

  for (const priceItem of productPriceList) {
    const sanKey = normalizeProductKey(priceItem.san_pham || "");
    const packageKey = normalizeProductKey(priceItem.package_product || "");
    const key = sanKey || packageKey;
    const matched =
      (sanKey && descKeys.has(sanKey)) ||
      (packageKey && descKeys.has(packageKey));
    if (!key || matched) continue;
    merged.push({
      id: priceItem.id,
      priceId: priceItem.id,
      catalogProductId: priceItem.catalog_product_id ?? null,
      productId: priceItem.san_pham || "",
      productName: priceItem.package_product || priceItem.san_pham || "",
      packageProduct: priceItem.package_product || priceItem.san_pham || "",
      packageName: priceItem.package || "",
      category: priceItem.category ?? null,
      categories: Array.isArray(priceItem.categories) ? priceItem.categories ?? [] : [],
      rules: "",
      rulesHtml: "",
      description: "",
      descriptionHtml: "",
      shortDescription: null,
      imageUrl: null,
      packageImageUrl: priceItem.package_image_url ?? null,
      descVariantId: pickDescVariantId(priceItem.desc_variant_id, null),
      isActive: normalizeVariantActive(priceItem.is_active, true),
    });
  }

  let result = merged;

  if (search) {
    result = result.filter((item) => {
      const haystack = `${item.productId || ""} ${item.productName || ""} ${
        item.description || ""
      } ${item.rules || ""}`
        .toLowerCase()
        .replace(/\s+/g, " ");
      return haystack.includes(search);
    });
  }

  const ranked = result.map((item) => ({ item }));
  ranked.sort((a, b) => {
    const wa = variantListSortRank(a.item);
    const wb = variantListSortRank(b.item);
    if (wa !== wb) return wa - wb;
    return String(a.item.productId || "").localeCompare(
      String(b.item.productId || ""),
      "vi",
      { sensitivity: "base" }
    );
  });
  return ranked.map((r) => r.item);
};
