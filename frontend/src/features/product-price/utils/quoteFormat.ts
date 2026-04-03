export const formatCurrency = (value: number): string =>
  value.toLocaleString("vi-VN");

export const displayDate = (iso: string): string => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

/** YYYY-MM-DD theo lịch local (hôm nay). */
export function todayYmdLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const htmlToPlainText = (value?: string | null): string => {
  if (!value) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(value, "text/html");
    const blockTags = new Set(["DIV", "P", "BR", "LI", "UL", "OL", "SECTION"]);
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
        const joined = childBuffer.join("");
        buffer.push(joined);
        if (blockTags.has(el.tagName)) {
          buffer.push("\n");
        }
      }
    };

    const rootBuffer: string[] = [];
    doc.body.childNodes.forEach((child) => walk(child, rootBuffer));
    return rootBuffer
      .join("")
      .replace(/\u00a0/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  } catch {
    return value || "";
  }
};
