/**
 * Format số, tiền, ngày, chuỗi an toàn cho Telegram (HTML escape, inline code).
 */

const formatYMDToDMY = (value) => {
  if (!value) return "";
  const str = String(value).trim();
  if (!str) return "";
  let match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  match = str.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  match = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return "";
};

const roundGiaBanValue = (value) => {
  const numeric = Number.isFinite(Number(value)) ? Number(value) : 0;
  if (numeric >= 0) return Math.floor(numeric + 0.5);
  return -Math.floor(Math.abs(numeric) + 0.5);
};

const toSafeString = (value) =>
  value === undefined || value === null ? "" : String(value);

const escapeHtml = (value) =>
  toSafeString(value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/&/g, "&")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeInlineText = (value) =>
  escapeHtml(value).replace(/\s+/g, " ").trim();

const toInlineCode = (value) => {
  const text = normalizeInlineText(value);
  return text ? `<code>${text}</code>` : "";
};

const toPlainText = (value) =>
  toSafeString(value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();



/** Số tiền CK chính xác từng đồng — giữ payment slot suffix, không làm tròn nghìn. */
const normalizeExactVnd = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.round(num));
};

const formatCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  try {
    return Math.round(num).toLocaleString("vi-VN");
  } catch {
    return String(Math.round(num));
  }
};

const formatDateDMY = (value) => {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const direct = toSafeString(value).trim();
  if (!direct) return "";
  const ymdMatch = direct.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (ymdMatch) return `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1]}`;
  const dmyMatch = direct.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (dmyMatch) return `${dmyMatch[1]}/${dmyMatch[2]}/${dmyMatch[3]}`;
  const parsed = new Date(direct);
  if (!Number.isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const fromYmd = formatYMDToDMY(direct);
  return fromYmd || direct;
};

module.exports = {
  toSafeString,
  escapeHtml,
  normalizeInlineText,
  toInlineCode,
  toPlainText,
  roundGiaBanValue,
  normalizeExactVnd,
  formatCurrency,
  formatDateDMY,
};
