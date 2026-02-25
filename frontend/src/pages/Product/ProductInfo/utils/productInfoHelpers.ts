import { ProductDescription } from "../../../../lib/productDescApi";

export const PAGE_SIZE = 10;

export type CategoryItem = {
  id: number;
  name: string;
  color?: string | null;
};

export type ProductPriceItem = {
  id: number;
  san_pham: string;
  package_product?: string | null;
  package?: string | null;
  category?: string | null;
  categories?: CategoryItem[] | null;
  image_url?: string | null;
};

export type MergedProduct = ProductDescription & {
  priceId?: number | null;
  packageProduct?: string | null;
  packageName?: string | null;
  category?: string | null;
  categories?: CategoryItem[];
  imageUrl?: string | null;
  packageImageUrl?: string | null;
  shortDescription?: string | null;
  rulesHtml?: string | null;
  descriptionHtml?: string | null;
};

export const getInitials = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "--";
  return trimmed.slice(0, 2).toUpperCase();
};

export const stripDurationSuffix = (value: string): string => {
  if (!value) return "";
  return value.replace(/--\d+m$/i, "").trim();
};

export const toHtmlFromPlain = (value: string): string =>
  (value || "").replace(/\n/g, "<br/>");

/** Chuẩn hóa key để so khớp (không split/bỏ suffix, lấy đúng display_name). */
export const normalizeProductKey = (value: string): string =>
  (value || "").trim().toLowerCase();

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const sanitizeHtmlForDisplay = (
  value: string | null | undefined
): string => {
  if (!value) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(value, "text/html");
    const blockTags = new Set([
      "DIV",
      "P",
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "UL",
      "OL",
      "LI",
      "SECTION",
    ]);
    const walk = (node: ChildNode): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return escapeHtml(node.textContent || "");
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === "BR") return "<br/>";
        if (el.tagName === "A") {
          const href = el.getAttribute("href") || "#";
          const safeHref = escapeHtml(href);
          const content = Array.from(el.childNodes).map(walk).join("");
          return `<a href="${safeHref}" title="${safeHref}" target="_blank" rel="noopener noreferrer">${content}</a>`;
        }
        const inner = Array.from(el.childNodes).map(walk).join("");
        if (blockTags.has(el.tagName)) {
          return `${inner}<br/>`;
        }
        return inner;
      }
      return "";
    };
    const raw = Array.from(doc.body.childNodes).map(walk).join("");
    return raw.replace(/(?:<br\/>\s*){3,}/g, "<br/><br/>");
  } catch {
    return escapeHtml(value);
  }
};

export const normalizeRichHtmlForSave = (
  value: string | null | undefined
): string => {
  if (!value) return "";
  return sanitizeHtmlForDisplay(value);
};

export const splitCombinedContent = (
  rulesHtmlRaw: string,
  descriptionHtmlRaw?: string | null
): { rulesHtml: string; descriptionHtml: string } => {
  if (descriptionHtmlRaw && descriptionHtmlRaw.trim()) {
    return {
      rulesHtml: rulesHtmlRaw || "",
      descriptionHtml: descriptionHtmlRaw,
    };
  }

  const normalized = (rulesHtmlRaw || "")
    .replace(/<\/?(?:p|div)[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>(?![\s\S]*<td)/gi, "\n")
    .replace(/<br\s*\/?>(?=\s*<\/)/gi, "\n")
    .replace(/<br\s*\/?>(?=\s*$)/gi, "\n");

  const normalizedNoAccent = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const markerRegex =
    /(Thông tin\s*&\s*tên sản phẩm|thông tin sản phẩm|mô tả|nội dung|tên sản phẩm)/i;
  const match = normalizedNoAccent.match(markerRegex);
  const toHtml = (val: string) =>
    val.replace(/\n+/g, "\n").split("\n").join("<br/>");

  if (match && (match.index ?? 0) >= 3) {
    const splitIndex = match.index ?? 0;
    const before = normalized.slice(0, splitIndex).trim();
    const after = normalized.slice(splitIndex).trim();
    return {
      rulesHtml: toHtml(before),
      descriptionHtml: toHtml(after),
    };
  }

  return {
    rulesHtml: rulesHtmlRaw || "",
    descriptionHtml: descriptionHtmlRaw || "",
  };
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
      productId: item.productId || "",
      productName:
        item.productName ||
        (priceRow ? (priceRow.package_product || priceRow.san_pham || "") : null) ||
        item.productId,
      packageProduct: priceRow ? (priceRow.package_product || priceRow.san_pham || "") : null,
      packageName: priceRow ? (priceRow.package || priceRow.san_pham || "") : null,
      category: priceRow?.category ?? null,
      categories: Array.isArray(priceRow?.categories) ? priceRow?.categories ?? [] : [],
      imageUrl: item.imageUrl ?? null,
      packageImageUrl: item.imageUrl ?? null,
      rulesHtml: item.rulesHtml || toHtmlFromPlain(item.rules || ""),
      descriptionHtml:
        item.descriptionHtml || toHtmlFromPlain(item.description || ""),
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
      imageUrl: null,
      packageImageUrl: null,
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

  return result;
};
