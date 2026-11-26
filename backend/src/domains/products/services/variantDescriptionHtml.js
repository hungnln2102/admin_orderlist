const sanitizeHtml = require("sanitize-html");

const allowedTags = [
  "p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "hr", "ul", "ol", "li",
  "blockquote", "a", "img", "figure", "figcaption", "span", "mark", "table", "tbody", "thead", "tr", "th", "td",
];
const legacyHtmlTag = new RegExp(`<(?:${allowedTags.join("|")})(?=[\\s/>])`, "i");
const linkSchemes = ["https", "http", "mailto", "tel"];
const alignableTags = ["p", "h2", "h3", "h4", "figure"];
const alignments = ["left", "center", "right"];
const textPalette = ["#111827", "#374151", "#dc2626", "#c2410c", "#15803d", "#1d4ed8", "#7e22ce"];
const highlightPalette = ["#fef08a", "#fecaca", "#fed7aa", "#bbf7d0", "#bfdbfe", "#e9d5ff"];
const allowedAttributes = {
  ...Object.fromEntries(alignableTags.map((tag) => [tag, ["style"]])),
  a: ["href", "title"],
  img: ["src", "alt", "title"],
  ol: ["start"],
  span: ["style"],
  mark: ["style"],
  th: ["colspan", "rowspan"],
  td: ["colspan", "rowspan"],
};
function getStyleValue(property, style) {
  const declarations = style?.toLowerCase().split(";") ?? [];
  for (const declaration of declarations.reverse()) {
    const separator = declaration.indexOf(":");
    if (separator >= 0 && declaration.slice(0, separator).trim() === property) {
      return declaration.slice(separator + 1).trim();
    }
  }
}

function normalizePaletteColor(value) {
  if (!value) return value;
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/.exec(value);
  return rgb && rgb.slice(1).every((channel) => Number(channel) <= 255)
    ? "#" + rgb.slice(1).map((channel) => Number(channel).toString(16).padStart(2, "0")).join("")
    : value;
}

const normalizeTableCell = (tagName, attribs) => {
  for (const attribute of ["colspan", "rowspan"]) {
    const value = attribs[attribute];
    if (!/^[1-9]\d*$/.test(value) || Number(value) > 100) delete attribs[attribute];
  }
  return { tagName, attribs };
};

const scopedStyle = (property, values, normalize = (value) => value) => (tagName, attribs) => {
  const value = normalize(getStyleValue(property, attribs.style));
  if (values.includes(value)) attribs.style = `${property}:${value}`;
  else delete attribs.style;
  return { tagName, attribs };
};

const escapeText = (text) => text.replace(/[&<>]/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
})[char]);

function isAbsoluteHttpsUrl(value) {
  if (!value || !/^https:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}

function sanitizeDescriptionHtml(html) {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes,
    parseStyleAttributes: false,
    allowedSchemes: linkSchemes,
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        if (attribs.href && !/^(https?:\/\/|mailto:|tel:)/i.test(attribs.href)) delete attribs.href;
        return { tagName, attribs };
      },
      // Each style-enabled tag is rebuilt from one permitted property and a closed set of values.
      ...Object.fromEntries(alignableTags.map((tag) => [tag, scopedStyle("text-align", alignments)])),
      span: scopedStyle("color", textPalette, normalizePaletteColor),
      mark: scopedStyle("background-color", highlightPalette, normalizePaletteColor),
      th: normalizeTableCell,
      td: normalizeTableCell,
    },
    exclusiveFilter: ({ tag, attribs }) => tag === "img" && !isAbsoluteHttpsUrl(attribs.src),
  }).trim();
}

function legacyDescriptionHtml(description) {
  if (!description?.trim()) return "";
  if (legacyHtmlTag.test(description)) return sanitizeDescriptionHtml(description);
  return description.trim().split(/(?:\r?\n){2,}/)
    .map((paragraph) => `<p>${escapeText(paragraph).replace(/\r?\n/g, "<br />")}</p>`)
    .join("");
}

module.exports = { sanitizeDescriptionHtml, legacyDescriptionHtml };
