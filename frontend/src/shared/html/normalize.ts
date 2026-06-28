import { escapeHtml, sanitizeHref } from "./sanitize";

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
      if (
        child.nodeType === Node.TEXT_NODE &&
        !hasMeaningfulText(child.textContent)
      ) {
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
