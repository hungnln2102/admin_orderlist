/**
 * Format số, tiền, ngày, chuỗi an toàn cho Telegram (HTML escape, inline code).
 */

const { formatYMDToDMY } = require("../../utils/normalizers");

const toSafeString = (value) =>
  value === undefined || value === null ? "" : String(value);

const escapeHtml = (value) =>
  toSafeString(value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/&/g, "&amp;")
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

const roundGiaBanValue = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num / 1000) * 1000;
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
  formatCurrency,
  formatDateDMY,
};
