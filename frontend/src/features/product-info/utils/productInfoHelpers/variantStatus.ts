import type { ProductDescription } from "@/features/product-info/api/productDescApi";
import type { MergedProduct } from "./types";
import { toHtmlFromPlain } from "./basic";
import { htmlToPlainText, sanitizeHtmlForDisplay } from "./htmlSanitize";
import { splitCombinedContent } from "./htmlNormalize";

/** Có ít nhất quy tắc hoặc mô tả thật (không rỗng sau tách + sanitize), giống logic cột bảng sản phẩm. */
export const variantHasDescContent = (
  item: Pick<
    ProductDescription,
    "rules" | "rulesHtml" | "description" | "descriptionHtml"
  >
): boolean => {
  const rawRulesHtml = item.rulesHtml || toHtmlFromPlain(item.rules || "");
  const rawDescriptionHtml =
    item.descriptionHtml || toHtmlFromPlain(item.description || "");
  const { rulesHtml: displayRulesHtml, descriptionHtml: displayDescriptionHtml } =
    splitCombinedContent(rawRulesHtml, rawDescriptionHtml);
  const safeRules = sanitizeHtmlForDisplay(displayRulesHtml);
  const safeDesc = sanitizeHtmlForDisplay(
    displayDescriptionHtml || toHtmlFromPlain(item.description || "")
  );
  const rulesText = htmlToPlainText(safeRules).replace(/\u00a0/g, " ").trim();
  const descText = htmlToPlainText(safeDesc).replace(/\u00a0/g, " ").trim();
  return Boolean(rulesText || descText);
};

/** Đã gắn bản ghi desc_variant trên variant (`id_desc` > 0). Ưu tiên dữ liệu từ /api/products. */
export const variantHasDescVariantLinked = (
  item: Pick<MergedProduct, "descVariantId">
): boolean => {
  const id = item.descVariantId;
  return id != null && Number(id) > 0;
};

/**
 * Thứ tự danh sách (nhỏ → lớn):
 * 0 chưa có nội dung (bật nhưng chưa đủ: chưa gắn desc_variant hoặc chưa có text)
 * → 1 inactive (unactive)
 * → 2 có nội dung (đã gắn + có quy tắc/mô tả).
 */
export const variantListSortRank = (item: MergedProduct): number => {
  if (item.isActive === false) return 1;
  const hasFull =
    variantHasDescVariantLinked(item) && variantHasDescContent(item);
  if (hasFull) return 2;
  return 0;
};
