const { normalizeOptionalText } = require("@/shared/text/normalizeOptionalText");
const { normalizeBoolean } = require("@/shared/validation/normalizeBoolean");

const normalizeAccountNumber = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "");

const normalizeBankBin = (value) => String(value || "").trim().replace(/\D/g, "");



const normalizeRoundedMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
};

module.exports = {
  normalizeAccountNumber,
  normalizeBankBin,
  normalizeBoolean,
  normalizeOptionalText,
  normalizeRoundedMoney,
};
