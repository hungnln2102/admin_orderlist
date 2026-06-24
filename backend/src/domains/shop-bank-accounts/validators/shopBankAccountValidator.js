const { body, validate } = require("../../../middleware/validateRequest");
const {
  normalizeAccountNumber,
  normalizeBankBin,
  normalizeBoolean,
  normalizeOptionalText,
} = require("../helpers/shopBankInputs");

const createShopBankAccountRules = [
  body("accountNumber")
    .customSanitizer((v) => String(v ?? "").trim())
    .notEmpty()
    .withMessage("Số tài khoản là bắt buộc."),
  body("accountHolder")
    .customSanitizer((v) => String(v ?? "").trim())
    .notEmpty()
    .withMessage("Tên chủ tài khoản là bắt buộc."),
  body("bankBin")
    .customSanitizer((v) => String(v ?? "").trim())
    .notEmpty()
    .withMessage("Mã BIN ngân hàng là bắt buộc."),
  validate,
];

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};


const validateBankBin = (bankBin) => {
  if (!/^\d{6}$/.test(bankBin)) {
    throw createHttpError(400, "Mã BIN phải gồm đúng 6 chữ số (VietQR).");
  }
};

const buildWritePayload = (payload, { forCreate }) => {
  const accountNumber = normalizeAccountNumber(payload?.accountNumber);
  const accountHolder = String(payload?.accountHolder || "").trim();
  const bankBin = normalizeBankBin(payload?.bankBin);

  if (!accountNumber) {
    throw createHttpError(400, "Số tài khoản không được để trống.");
  }
  if (!accountHolder) {
    throw createHttpError(400, "Tên chủ tài khoản không được để trống.");
  }
  if (!bankBin) {
    throw createHttpError(400, "Mã BIN ngân hàng không được để trống.");
  }
  validateBankBin(bankBin);

  const out = {
    label: normalizeOptionalText(payload?.label),
    accountNumber,
    accountHolder,
    bankBin,
    bankShortCode: normalizeOptionalText(payload?.bankShortCode),
    bankDisplayName: normalizeOptionalText(payload?.bankDisplayName),
    qrNotePrefix: normalizeOptionalText(payload?.qrNotePrefix),
  };

  if (forCreate || Object.prototype.hasOwnProperty.call(payload || {}, "isActive")) {
    out.isActive = normalizeBoolean(payload?.isActive, true);
  }
  if (forCreate || Object.prototype.hasOwnProperty.call(payload || {}, "isDefault")) {
    out.isDefault = normalizeBoolean(payload?.isDefault, forCreate ? false : undefined);
  }

  return out;
};

const validateCreatePayload = (payload) => buildWritePayload(payload, { forCreate: true });

const validateUpdatePayload = (id, payload) => {
  const normalizedId = Number(id);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    throw createHttpError(400, "ID tài khoản không hợp lệ.");
  }

  const hasAnyField = [
    "label",
    "accountNumber",
    "accountHolder",
    "bankBin",
    "bankShortCode",
    "bankDisplayName",
    "qrNotePrefix",
    "isActive",
    "isDefault",
  ].some((key) => Object.prototype.hasOwnProperty.call(payload || {}, key));

  if (!hasAnyField) {
    throw createHttpError(400, "Không có dữ liệu để cập nhật.");
  }

  const updatePayload = {};
  if (Object.prototype.hasOwnProperty.call(payload || {}, "label")) {
    updatePayload.label = normalizeOptionalText(payload?.label);
  }
  if (Object.prototype.hasOwnProperty.call(payload || {}, "accountNumber")) {
    updatePayload.accountNumber = normalizeAccountNumber(payload?.accountNumber);
    if (!updatePayload.accountNumber) {
      throw createHttpError(400, "Số tài khoản không được để trống.");
    }
  }
  if (Object.prototype.hasOwnProperty.call(payload || {}, "accountHolder")) {
    updatePayload.accountHolder = String(payload?.accountHolder || "").trim();
    if (!updatePayload.accountHolder) {
      throw createHttpError(400, "Tên chủ tài khoản không được để trống.");
    }
  }
  if (Object.prototype.hasOwnProperty.call(payload || {}, "bankBin")) {
    updatePayload.bankBin = normalizeBankBin(payload?.bankBin);
    if (!updatePayload.bankBin) {
      throw createHttpError(400, "Mã BIN ngân hàng không được để trống.");
    }
    validateBankBin(updatePayload.bankBin);
  }
  if (Object.prototype.hasOwnProperty.call(payload || {}, "bankShortCode")) {
    updatePayload.bankShortCode = normalizeOptionalText(payload?.bankShortCode);
  }
  if (Object.prototype.hasOwnProperty.call(payload || {}, "bankDisplayName")) {
    updatePayload.bankDisplayName = normalizeOptionalText(payload?.bankDisplayName);
  }
  if (Object.prototype.hasOwnProperty.call(payload || {}, "qrNotePrefix")) {
    updatePayload.qrNotePrefix = normalizeOptionalText(payload?.qrNotePrefix);
  }
  if (Object.prototype.hasOwnProperty.call(payload || {}, "isActive")) {
    updatePayload.isActive = normalizeBoolean(payload?.isActive, true);
  }
  if (Object.prototype.hasOwnProperty.call(payload || {}, "isDefault")) {
    updatePayload.isDefault = normalizeBoolean(payload?.isDefault, false);
  }

  return { id: normalizedId, updatePayload };
};

const validateDeletePayload = (id) => {
  const normalizedId = Number(id);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    throw createHttpError(400, "ID tài khoản không hợp lệ.");
  }
  return normalizedId;
};

const validateSetDefaultPayload = (id) => validateDeletePayload(id);

module.exports = {
  createShopBankAccountRules,
  createHttpError,
  validateCreatePayload,
  validateUpdatePayload,
  validateDeletePayload,
  validateSetDefaultPayload,
};
