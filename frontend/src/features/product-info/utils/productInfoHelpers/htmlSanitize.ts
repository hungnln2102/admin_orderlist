export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const sanitizeHref = (href: string | null | undefined): string => {
  const trimmed = String(href || "").trim();
  if (!trimmed) return "";
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return /^(https?:|mailto:|tel:)/i.test(trimmed) ? trimmed : "";
  }
  return trimmed;
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
        if (!String(el.textContent || "").replace(/\u00a0/g, " ").trim()) return "";
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

      return inner;
    };

    const raw = Array.from(doc.body.childNodes).map(walk).join("");
    return raw.replace(/(?:<br\/>\s*){3,}/g, "<br/><br/>");
  } catch {
    return escapeHtml(value);
  }
};
