const { BATCH_CODE_REGEX_STRICT } = require("@/domains/payments/controller/shared/constants");

const MAV_ORDER_PREFIX_RE = /^MAV[A-Z0-9]{2,}/i;
const TRANSACTION_CODE_REGEX_GLOBAL = /\b[A-Z0-9]{8}\b/gi;

const normalizeTransactionToken = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(normalized)) return "";
  if (BATCH_CODE_REGEX_STRICT.test(normalized)) return "";
  if (MAV_ORDER_PREFIX_RE.test(normalized)) return "";
  return normalized;
};

/**
 * Trích mã transaction 8 ký tự từ chuỗi / mảng (MAVG, MAV… bị loại).
 */
const parseTransactionCodesInput = (rawValue) => {
  const parts = Array.isArray(rawValue)
    ? rawValue
    : typeof rawValue === "string"
      ? [rawValue]
      : [];
  const unique = new Set();

  for (const part of parts) {
    const text = String(part || "").trim();
    if (!text) continue;

    const tokens = text.split(/[\s,;|\n\r\t]+/).filter(Boolean);
    for (const token of tokens) {
      const direct = normalizeTransactionToken(token);
      if (direct) {
        unique.add(direct);
        continue;
      }
      const matches = token.toUpperCase().match(TRANSACTION_CODE_REGEX_GLOBAL) || [];
      for (const match of matches) {
        const normalized = normalizeTransactionToken(match);
        if (normalized) unique.add(normalized);
      }
    }
  }

  return [...unique];
};

module.exports = {
  parseTransactionCodesInput,
  normalizeTransactionToken,
};
