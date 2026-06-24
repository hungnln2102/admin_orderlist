const { normalizeOptionalText } = require("../../../shared/text/normalizeOptionalText");
const { normalizeBoolean } = require("../../../shared/validation/normalizeBoolean");

const normalizeWalletAddress = (value) => String(value || "").trim();



module.exports = {
  normalizeBoolean,
  normalizeOptionalText,
  normalizeWalletAddress,
};
