import { ProductDescription } from "../../../../lib/productDescApi";

export const PAGE_SIZE = 10;

export type ProductPriceItem = {
  id: number;
  san_pham: string;
  package_product?: string | null;
  package?: string | null;
};

export type MergedProduct = ProductDescription & {
  packageProduct?: string | null;
  packageName?: string | null;
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

export const normalizeProductKey = (value: string): string =>
  stripDurationSuffix(value).toLowerCase();

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

  const mergedMap = new Map<string, MergedProduct>();

  for (const item of productDescs) {
    const normalizedId = normalizeProductKey(item.productId || "");
    const priceRow = normalizedId ? priceMap.get(normalizedId) : null;
    const merged: MergedProduct = {
      ...item,
      productId: stripDurationSuffix(item.productId || ""),
      productName:
        item.productName ||
        (priceRow
          ? stripDurationSuffix(
              priceRow.package_product || priceRow.san_pham || ""
            )
          : null) ||
        item.productId,
      packageProduct: priceRow
        ? stripDurationSuffix(priceRow.package_product || priceRow.san_pham || "")
        : null,
      packageName: priceRow
        ? stripDurationSuffix(priceRow.package || priceRow.san_pham || "")
        : null,
      rulesHtml: item.rulesHtml || toHtmlFromPlain(item.rules || ""),
      descriptionHtml:
        item.descriptionHtml || toHtmlFromPlain(item.description || ""),
    };
    const key = normalizedId || normalizeProductKey(merged.productName || "");
    if (!key) continue;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, merged);
    }
  }

  for (const priceItem of productPriceList) {
    const sanKey = normalizeProductKey(priceItem.san_pham || "");
    const packageKey = normalizeProductKey(priceItem.package_product || "");
    const key = sanKey || packageKey;
    const matched =
      (sanKey && mergedMap.has(sanKey)) ||
      (packageKey && mergedMap.has(packageKey));
    if (!key || matched) continue;
    mergedMap.set(key, {
      id: priceItem.id,
      productId: stripDurationSuffix(priceItem.san_pham || ""),
      productName: stripDurationSuffix(
        priceItem.package_product || priceItem.san_pham || ""
      ),
      packageProduct: stripDurationSuffix(
        priceItem.package_product || priceItem.san_pham || ""
      ),
      packageName: stripDurationSuffix(priceItem.package || ""),
      rules: "",
      rulesHtml: "",
      description: "",
      descriptionHtml: "",
      imageUrl: null,
    });
  }

  let merged = Array.from(mergedMap.values());

  if (search) {
    merged = merged.filter((item) => {
      const haystack = `${item.productId || ""} ${item.productName || ""} ${
        item.description || ""
      } ${item.rules || ""}`
        .toLowerCase()
        .replace(/\s+/g, " ");
      return haystack.includes(search);
    });
  }

  return merged;
};
