const { body, validate } = require("@/middleware/validateRequest");
const {
  normalizeBoolean,
  normalizeOptionalText,
  normalizeWalletAddress,
} = require("@/domains/usdt-wallets/helpers/usdtWalletInputs");

const SUPPORTED_NETWORKS = ["TRC20", "ERC20", "BEP20", "SOL", "TON"];

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};


const normalizeNetwork = (value, fallback = "TRC20") => {
  const text = String(value || fallback).trim().toUpperCase();
  if (!SUPPORTED_NETWORKS.includes(text)) {
    throw createHttpError(
      400,
      `Mạng lưới không hợp lệ. Hỗ trợ: ${SUPPORTED_NETWORKS.join(", ")}.`
    );
  }
  return text;
};


const buildWritePayload = (payload, { forCreate }) => {
  const walletAddress = normalizeWalletAddress(payload?.walletAddress);
  const network = normalizeNetwork(payload?.network);

  if (!walletAddress) {
    throw createHttpError(400, "Địa chỉ ví không được để trống.");
  }

  const out = {
    label: normalizeOptionalText(payload?.label),
    walletAddress,
    network,
  };

  if (forCreate || Object.prototype.hasOwnProperty.call(payload || {}, "isActive")) {
    out.isActive = normalizeBoolean(payload?.isActive, true);
  }
  if (forCreate || Object.prototype.hasOwnProperty.call(payload || {}, "isDefault")) {
    out.isDefault = normalizeBoolean(payload?.isDefault, false);
  }

  return out;
};

const validateCreatePayload = (payload) => buildWritePayload(payload, { forCreate: true });

const validateUpdatePayload = (id, payload) => {
  const normalizedId = Number(id);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    throw createHttpError(400, "ID ví không hợp lệ.");
  }
  const updatePayload = buildWritePayload(payload, { forCreate: false });
  return { id: normalizedId, updatePayload };
};

const validateDeletePayload = (id) => {
  const normalizedId = Number(id);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    throw createHttpError(400, "ID ví không hợp lệ.");
  }
  return normalizedId;
};

const validateSetDefaultPayload = validateDeletePayload;

const createUsdtWalletRules = [
  body("walletAddress")
    .customSanitizer((v) => String(v ?? "").trim())
    .notEmpty()
    .withMessage("Địa chỉ ví là bắt buộc."),
  validate,
];

module.exports = {
  createHttpError,
  createUsdtWalletRules,
  validateCreatePayload,
  validateUpdatePayload,
  validateDeletePayload,
  validateSetDefaultPayload,
  SUPPORTED_NETWORKS,
};
