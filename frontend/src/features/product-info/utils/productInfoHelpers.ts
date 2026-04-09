import { ProductDescription } from "@/lib/productDescApi";

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

export const getInitials = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "--";
  return trimmed.slice(0, 2).toUpperCase();
};

/**
 * Ảnh cột biến thể: chỉ hiển thị khi URL khác ảnh gói.
 * Tránh lặp logo gói khi API/DB từng COALESCE(variant → product) hoặc copy cùng URL.
 */
export const resolveVariantDisplayImageUrl = (
  item: Pick<MergedProduct, "imageUrl" | "packageImageUrl">
): string | null => {
  const variant = (item.imageUrl || "").trim();
  if (!variant) return null;
  const pkg = (item.packageImageUrl || "").trim();
  if (pkg && variant === pkg) return null;
  return item.imageUrl ?? null;
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

/** Chuẩn hóa cờ active từ API (`is_active`). Mặc định true nếu không có dữ liệu. */
export const normalizeVariantActive = (
  raw: unknown,
  defaultActive = true
): boolean => {
  if (raw === undefined || raw === null) return defaultActive;
  if (typeof raw === "boolean") return raw;
  const s = String(raw).trim().toLowerCase();
  if (s === "false" || s === "0" || s === "no" || s === "off") return false;
  if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
  return defaultActive;
};

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const hasMeaningfulText = (value: string | null | undefined): boolean =>
  Boolean((value || "").replace(/\u00a0/g, " ").trim());

const unwrapElement = (element: HTMLElement) => {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
};

const replaceElementTag = (
  element: HTMLElement,
  nextTagName: string
): HTMLElement => {
  const doc = element.ownerDocument;
  const replacement = doc.createElement(nextTagName);
  Array.from(element.attributes).forEach((attr) => {
    replacement.setAttribute(attr.name, attr.value);
  });
  while (element.firstChild) {
    replacement.appendChild(element.firstChild);
  }
  element.replaceWith(replacement);
  return replacement;
};

const sanitizeHref = (href: string | null | undefined): string => {
  const trimmed = String(href || "").trim();
  if (!trimmed) return "";
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return /^(https?:|mailto:|tel:)/i.test(trimmed) ? trimmed : "";
  }
  return trimmed;
};

const plainTextToSeoHtml = (
  value: string | null | undefined,
  options: { preserveLineBreaks?: boolean; allowEmpty?: boolean } = {}
): string => {
  const normalized = String(value || "")
    .replace(/\r\n?/g, "\n")
    .trim();
  if (!normalized && !options.allowEmpty) return "";

  return normalized
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    )
    .filter((lines) => lines.length > 0)
    .map((lines) => {
      const inner = options.preserveLineBreaks
        ? lines.map(escapeHtml).join("<br/>")
        : escapeHtml(lines.join(" "));
      return `<p>${inner}</p>`;
    })
    .join("\n");
};

export const htmlToPlainText = (value?: string | null): string => {
  if (!value) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(value, "text/html");
    const blockTags = new Set([
      "DIV",
      "P",
      "BR",
      "LI",
      "UL",
      "OL",
      "SECTION",
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "BLOCKQUOTE",
    ]);
    const lines: string[] = [];

    const walk = (node: ChildNode, buffer: string[]) => {
      if (node.nodeType === Node.TEXT_NODE) {
        buffer.push((node.textContent || "").replace(/\u00a0/g, " "));
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === "BR") {
          buffer.push("\n");
          return;
        }
        const childBuffer: string[] = [];
        el.childNodes.forEach((child) => walk(child, childBuffer));
        buffer.push(childBuffer.join(""));
        if (blockTags.has(el.tagName)) {
          buffer.push("\n");
        }
      }
    };

    doc.body.childNodes.forEach((child) => walk(child, lines));

    return lines
      .join("")
      .replace(/\u00a0/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  } catch {
    return value || "";
  }
};

const normalizeSeoHtmlTree = (
  value: string | null | undefined,
  options: { allowHeadings?: boolean } = {}
): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (!/<[a-z][\s\S]*>/i.test(raw)) {
    return plainTextToSeoHtml(raw);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/html");
  const body = doc.body;
  const dangerousTags = [
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "form",
    "input",
    "textarea",
    "select",
    "button",
    "meta",
    "link",
  ];
  dangerousTags.forEach((tag) => {
    body.querySelectorAll(tag).forEach((element) => element.remove());
  });

  const structuralTags = new Set([
    "P",
    "DIV",
    "SECTION",
    "ARTICLE",
    "UL",
    "OL",
    "LI",
    "BLOCKQUOTE",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
  ]);

  Array.from(body.querySelectorAll("*")).forEach((element) => {
    let current = element as HTMLElement;
    const tagName = current.tagName.toUpperCase();

    if (tagName === "B") {
      current = replaceElementTag(current, "strong");
    } else if (tagName === "I") {
      current = replaceElementTag(current, "em");
    } else if (tagName === "U") {
      unwrapElement(current);
      return;
    } else if (tagName === "H1") {
      current = replaceElementTag(
        current,
        options.allowHeadings === false ? "p" : "h1"
      );
    } else if (tagName === "H5" || tagName === "H6") {
      current = replaceElementTag(
        current,
        options.allowHeadings === false ? "p" : "h4"
      );
    } else if (
      options.allowHeadings === false &&
      ["H2", "H3", "H4"].includes(tagName)
    ) {
      current = replaceElementTag(current, "p");
    } else if (["DIV", "SECTION", "ARTICLE"].includes(tagName)) {
      const hasNestedBlock = Array.from(current.children).some((child) =>
        structuralTags.has(child.tagName.toUpperCase())
      );
      if (hasNestedBlock) {
        unwrapElement(current);
        return;
      }
      current = replaceElementTag(current, "p");
    } else if (
      ["SPAN", "FONT", "MARK", "SMALL", "BIG", "INS", "SUB", "SUP"].includes(
        tagName
      )
    ) {
      unwrapElement(current);
      return;
    }

    if (current.tagName === "A") {
      const href = sanitizeHref(current.getAttribute("href"));
      Array.from(current.attributes).forEach((attr) =>
        current.removeAttribute(attr.name)
      );
      if (!href) {
        unwrapElement(current);
        return;
      }
      current.setAttribute("href", href);
      return;
    }

    Array.from(current.attributes).forEach((attr) =>
      current.removeAttribute(attr.name)
    );
  });

  body.querySelectorAll("ul,ol").forEach((listElement) => {
    Array.from(listElement.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE && !hasMeaningfulText(child.textContent)) {
        child.remove();
        return;
      }
      if (
        child.nodeType === Node.ELEMENT_NODE &&
        (child as HTMLElement).tagName.toUpperCase() === "LI"
      ) {
        return;
      }
      const li = doc.createElement("li");
      listElement.insertBefore(li, child);
      li.appendChild(child);
    });
  });

  const rootBlockTags = new Set([
    "P",
    "H1",
    "H2",
    "H3",
    "H4",
    "UL",
    "OL",
    "BLOCKQUOTE",
  ]);
  const wrapInlineRuns = () => {
    const nodes = Array.from(body.childNodes);
    let buffer: ChildNode[] = [];

    const flush = () => {
      if (!buffer.length) return;
      const meaningful = buffer.some(
        (node) =>
          node.nodeType !== Node.TEXT_NODE ||
          hasMeaningfulText(node.textContent)
      );
      if (!meaningful) {
        buffer.forEach((node) => node.remove());
        buffer = [];
        return;
      }
      const paragraph = doc.createElement("p");
      const firstNode = buffer[0];
      body.insertBefore(paragraph, firstNode);
      buffer.forEach((node) => paragraph.appendChild(node));
      buffer = [];
    };

    nodes.forEach((node) => {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        rootBlockTags.has((node as HTMLElement).tagName.toUpperCase())
      ) {
        flush();
        return;
      }
      buffer.push(node);
    });

    flush();
  };

  wrapInlineRuns();

  const h1Elements = Array.from(body.querySelectorAll("h1"));
  h1Elements.forEach((element, index) => {
    if (index === 0) return;
    replaceElementTag(element as HTMLElement, "h2");
  });

  const allowedTags = new Set([
    "P",
    "H1",
    "H2",
    "H3",
    "H4",
    "UL",
    "OL",
    "LI",
    "BLOCKQUOTE",
    "STRONG",
    "EM",
    "A",
    "BR",
  ]);

  Array.from(body.querySelectorAll("*")).forEach((element) => {
    const tagName = element.tagName.toUpperCase();
    if (!allowedTags.has(tagName)) {
      unwrapElement(element);
    }
  });

  Array.from(body.querySelectorAll("*"))
    .reverse()
    .forEach((element) => {
      const tagName = element.tagName.toUpperCase();
      if (tagName === "BR") return;
      if ((tagName === "UL" || tagName === "OL") && !element.querySelector("li")) {
        element.remove();
        return;
      }
      if (
        (tagName === "LI" || tagName === "P" || tagName === "BLOCKQUOTE") &&
        !hasMeaningfulText(element.textContent)
      ) {
        element.remove();
        return;
      }
      if (
        ["H2", "H3", "H4", "A", "STRONG", "EM"].includes(tagName) &&
        !hasMeaningfulText(element.textContent)
      ) {
        element.remove();
      }
    });

  const normalized = body.innerHTML
    .replace(/&nbsp;/gi, " ")
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br/><br/>")
    .replace(/>\s+</g, "><")
    .trim();

  return normalized;
};

export const sanitizeHtmlForDisplay = (
  value: string | null | undefined
): string => {
  if (!value) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(value, "text/html");

    const walk = (node: ChildNode): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return escapeHtml(node.textContent || "");
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const el = node as HTMLElement;
      const tag = el.tagName.toUpperCase();

      if (
        tag === "SCRIPT" ||
        tag === "STYLE" ||
        tag === "IFRAME" ||
        tag === "OBJECT" ||
        tag === "EMBED" ||
        tag === "NOSCRIPT"
      ) {
        return "";
      }

      if (tag === "BR") return "<br/>";

      if (tag === "A") {
        const href = sanitizeHref(el.getAttribute("href"));
        if (!href) {
          return Array.from(el.childNodes).map(walk).join("");
        }
        const safeHref = escapeHtml(href);
        const content = Array.from(el.childNodes).map(walk).join("");
        return `<a href="${safeHref}" title="${safeHref}" target="_blank" rel="noopener noreferrer">${content}</a>`;
      }

      const inner = Array.from(el.childNodes).map(walk).join("");

      if (tag === "STRONG" || tag === "B") {
        return inner ? `<strong>${inner}</strong>` : "";
      }
      if (tag === "EM" || tag === "I") {
        return inner ? `<em>${inner}</em>` : "";
      }
      if (tag === "UL") return inner ? `<ul>${inner}</ul>` : "";
      if (tag === "OL") return inner ? `<ol>${inner}</ol>` : "";
      if (tag === "LI") return inner ? `<li>${inner}</li>` : "";

      const semanticBlock = [
        "P",
        "H1",
        "H2",
        "H3",
        "H4",
        "H5",
        "H6",
        "DIV",
        "SECTION",
        "BLOCKQUOTE",
        "ARTICLE",
        "HEADER",
        "FOOTER",
        "MAIN",
        "ASIDE",
        "NAV",
      ];
      if (semanticBlock.includes(tag)) {
        if (!hasMeaningfulText(el.textContent)) return "";
        const tagLower = tag.toLowerCase();
        if (
          tag === "DIV" ||
          tag === "SECTION" ||
          tag === "ARTICLE" ||
          tag === "HEADER" ||
          tag === "FOOTER" ||
          tag === "MAIN" ||
          tag === "ASIDE" ||
          tag === "NAV"
        ) {
          return `<div class="rich-display__block">${inner}</div>`;
        }
        if (tag === "BLOCKQUOTE") {
          return `<blockquote class="rich-display__quote">${inner}</blockquote>`;
        }
        return `<${tagLower}>${inner}</${tagLower}>`;
      }

      // span, font, và thẻ lạ: chỉ giữ nội dung con đã được walk
      return inner;
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
  return normalizeSeoHtmlTree(value, { allowHeadings: true });
};

export const normalizeShortDescriptionForSave = (
  value: string | null | undefined
): string => plainTextToSeoHtml(value);

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

  // Chưa có nội dung → inactive → có nội dung.
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
