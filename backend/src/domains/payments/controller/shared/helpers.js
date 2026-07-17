const crypto = require("crypto");
const {
  normalizeIntegerVndAmount,
} = require("@/shared/money/normalizers");
const {
  ORDER_CODE_REGEX_GLOBAL,
  BATCH_CODE_REGEX_STRICT,
  BATCH_CODE_PREFIX,
} = require("@/domains/payments/controller/shared/constants");
const {
  parseTransactionCodesInput,
} = require("@/domains/payments/controller/shared/parseTransactionCodesInput");

const normalizeMoney = normalizeIntegerVndAmount;

const parseOrderCodesInput = (rawValue) => {
  const parts = Array.isArray(rawValue)
    ? rawValue
    : typeof rawValue === "string"
      ? [rawValue]
      : [];
  const unique = new Set();
  for (const part of parts) {
    const matches = String(part || "").toUpperCase().match(ORDER_CODE_REGEX_GLOBAL) || [];
    for (const code of matches) {
      const normalized = String(code || "").trim().toUpperCase();
      if (!normalized || BATCH_CODE_REGEX_STRICT.test(normalized)) continue;
      unique.add(normalized);
    }
  }
  return [...unique];
};

const generateCandidateBatchCode = () => {
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${BATCH_CODE_PREFIX}${suffix}`;
};

const hasMissingTableError = (error, tableName) =>
  error?.code === "42P01" &&
  String(error?.message || "").toLowerCase().includes(String(tableName || "").toLowerCase());

const isMissingBatchTablesError = (error) =>
  hasMissingTableError(error, "payment_receipt_batch") ||
  hasMissingTableError(error, "payment_receipt_batch_item");

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const toMonthKey = (value) => {
  if (!value) return null;
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

module.exports = {
  normalizeMoney,
  parseOrderCodesInput,
  parseTransactionCodesInput,
  generateCandidateBatchCode,
  hasMissingTableError,
  isMissingBatchTablesError,
  createHttpError,
  toMonthKey,
};
