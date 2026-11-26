import DOMPurify from "dompurify";
import type { EditorialStatus } from "./types";

export const EDITORIAL_STATUS_LABEL: Record<EditorialStatus, string> = {
  draft: "Bản nháp",
  in_review: "Chờ duyệt",
  changes_requested: "Cần chỉnh sửa",
  published: "Đã xuất bản",
};

export const EDITORIAL_ACTION_LABEL: Record<string, string> = {
  legacy: "Mô tả trước khi biên tập",
  save: "Lưu nháp",
  save_draft: "Lưu nháp",
  submit: "Gửi duyệt",
  request_changes: "Yêu cầu chỉnh sửa",
  publish: "Xuất bản",
  restore: "Khôi phục vào bản nháp",
};

export const EDITORIAL_TEMPLATES = [
  { value: "overview", label: "Giới thiệu gói", html: "<h2>Tổng quan</h2><p></p><h2>Quyền lợi</h2><ul><li><p></p></li></ul><h2>Điều kiện sử dụng</h2><p></p>" },
  { value: "activation", label: "Hướng dẫn kích hoạt", html: "<h2>Hướng dẫn kích hoạt</h2><ol><li><p></p></li><li><p></p></li></ol><h3>Lưu ý</h3><p></p>" },
  { value: "warranty", label: "Bảo hành và hỗ trợ", html: "<h2>Bảo hành và hỗ trợ</h2><h3>Phạm vi bảo hành</h3><p></p><h3>Cách yêu cầu hỗ trợ</h3><p></p>" },
];

export const EDITORIAL_TEXT_COLORS = [
  { value: "#111827", label: "Đen" },
  { value: "#374151", label: "Xám" },
  { value: "#dc2626", label: "Đỏ" },
  { value: "#c2410c", label: "Cam" },
  { value: "#15803d", label: "Xanh lá" },
  { value: "#1d4ed8", label: "Xanh dương" },
  { value: "#7e22ce", label: "Tím" },
];

export const EDITORIAL_HIGHLIGHTS = [
  { value: "#fef08a", label: "Vàng" },
  { value: "#fecaca", label: "Đỏ nhạt" },
  { value: "#fed7aa", label: "Cam nhạt" },
  { value: "#bbf7d0", label: "Xanh lá nhạt" },
  { value: "#bfdbfe", label: "Xanh dương nhạt" },
  { value: "#e9d5ff", label: "Tím nhạt" },
];

const EDITORIAL_TAGS = [
  "p", "br", "strong", "b", "em", "i", "a", "h2", "h3", "h4", "ol", "ul", "li", "blockquote", "img",
  "u", "s", "hr", "span", "mark", "table", "tbody", "thead", "tr", "th", "td", "figure", "figcaption",
];
const EDITORIAL_TAG_PATTERNS = new RegExp(`<(?:${EDITORIAL_TAGS.join("|")})(?=[\\s/>])`, "i");

function paletteValue(value: string, palette: typeof EDITORIAL_TEXT_COLORS) {
  const rgb = value.match(/^rgb\(\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\s*\)$/);
  const normalized = rgb && rgb.slice(1).every((part) => Number(part) <= 255)
    ? `#${rgb.slice(1).map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`
    : value.toLowerCase();
  return palette.find((color) => color.value === normalized)?.value;
}

function restrictEditorialStyles(fragment: DocumentFragment) {
  fragment.querySelectorAll<HTMLElement>("[style]").forEach((node) => {
    const alignment = node.matches("p,h2,h3,h4,figure") && ["left", "center", "right"].includes(node.style.textAlign)
      ? node.style.textAlign
      : "";
    const color = node.matches("span") ? paletteValue(node.style.color, EDITORIAL_TEXT_COLORS) : undefined;
    const background = node.matches("mark") ? paletteValue(node.style.backgroundColor, EDITORIAL_HIGHLIGHTS) : undefined;
    const style = alignment ? `text-align:${alignment}` : color ? `color:${color}` : background ? `background-color:${background}` : "";
    node.removeAttribute("style");
    if (style) node.setAttribute("style", style);
  });
}

export function isSecureImage(value: string) {
  if (!/^https:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function isEditorialLink(value: string) {
  if (!/^(https?:\/\/|mailto:|tel:)/i.test(value)) return false;
  try {
    return ["https:", "http:", "mailto:", "tel:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function sanitizeEditorialHtml(html: string, forPreview = false) {
  const fragment = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: EDITORIAL_TAGS,
    ALLOWED_ATTR: ["href", "src", "alt", "title", "start", "style", "colspan", "rowspan"],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  });
  restrictEditorialStyles(fragment);

  fragment.querySelectorAll("[colspan],[rowspan]").forEach((cell) => {
    for (const attribute of ["colspan", "rowspan"]) {
      const value = cell.getAttribute(attribute);
      if (value !== null && (!cell.matches("td,th") || !/^(?:[1-9]\d?|100)$/.test(value))) cell.removeAttribute(attribute);
    }
  });

  fragment.querySelectorAll("img").forEach((image) => {
    if (!isSecureImage(image.getAttribute("src") ?? "")) image.remove();
  });
  fragment.querySelectorAll("a").forEach((link) => {
    if (!isEditorialLink(link.getAttribute("href") ?? "")) link.removeAttribute("href");
  });

  if (forPreview) {
    fragment.querySelectorAll("table").forEach((table) => {
      const wrapper = document.createElement("div");
      wrapper.className = "editorial-table-scroll";
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute("aria-label", "Bảng nội dung");
      wrapper.tabIndex = 0;
      const columns = Array.from(table.rows[0]?.cells ?? []).reduce((total, cell) => total + cell.colSpan, 0);
      wrapper.style.setProperty("--editorial-table-width", `${Math.max(24, columns * 6)}rem`);
      table.replaceWith(wrapper);
      wrapper.append(table);
    });
  }

  const container = document.createElement("div");
  container.append(fragment);
  return container.innerHTML;
}

export function editorialPlainText(html: string) {
  if (!EDITORIAL_TAG_PATTERNS.test(html)) {
    return html.replace(/\s+/g, " ").trim();
  }
  const source = document.createElement("template");
  source.innerHTML = html.replace(/<\/?(?:p|li|h[2-4]|blockquote|br)\b[^>]*>/gi, " ");
  source.content.querySelectorAll("script,style").forEach((node) => node.remove());
  return source.content.textContent?.replace(/\s+/g, " ").trim() ?? "";
}
