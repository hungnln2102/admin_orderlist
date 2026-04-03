import { VARIANT_PRICING_COLS } from "@/lib/tableSql";
import type { ProductDesc, QuoteLine, QuoteProductDescSection } from "../types";
import { htmlToPlainText } from "./quoteFormat";
import {
  normalizeKey,
  normalizeProductKey,
  stripDurationSuffix,
} from "./quoteNormalize";

/** Gói / tên biến thể theo mã sản phẩm (đã chuẩn hóa key). */
export function buildPackageProductMap(
  productPrices: Record<string, any>[]
): Map<string, string> {
  const map = new Map<string, string>();
  productPrices.forEach((row) => {
    const productCode =
      (row?.[VARIANT_PRICING_COLS.code] as string) ||
      (row?.san_pham as string) ||
      "";
    const packageProduct =
      (row?.[VARIANT_PRICING_COLS.variantName] as string) ||
      (row?.package_product as string) ||
      (row?.package_product_label as string) ||
      "";
    const key = normalizeKey(stripDurationSuffix(productCode));
    if (key && packageProduct) {
      map.set(key, packageProduct);
    }
  });
  return map;
}

export function buildProductDescMap(
  productDescs: ProductDesc[]
): Map<string, ProductDesc> {
  const map = new Map<string, ProductDesc>();
  productDescs.forEach((item) => {
    const key = normalizeKey(stripDurationSuffix(item.productId));
    if (key) map.set(key, item);
  });
  return map;
}

export function buildProductDescSections(
  lines: QuoteLine[],
  productDescMap: Map<string, ProductDesc>,
  packageProductMap: Map<string, string>
): QuoteProductDescSection[] {
  const seen = new Set<string>();
  const sections: QuoteProductDescSection[] = [];
  lines.forEach((line) => {
    const rawCode = line.productCode || line.product || "";
    const key = normalizeKey(stripDurationSuffix(rawCode));
    if (!key || seen.has(key)) return;
    seen.add(key);
    const desc = productDescMap.get(key);
    const packageProductName =
      packageProductMap.get(key) || line.packageName || line.product;
    sections.push({
      name: packageProductName,
      rules: htmlToPlainText(desc?.rules),
      description: htmlToPlainText(desc?.description),
    });
  });
  return sections;
}

/** Map normalizeProductKey(value) → option (dùng sau buildProductOptions). */
export function indexProductOptionsByKey<T extends { value: string }>(
  productOptions: T[]
): Map<string, T> {
  const map = new Map<string, T>();
  productOptions.forEach((opt) => {
    map.set(normalizeProductKey(opt.value), opt);
  });
  return map;
}
