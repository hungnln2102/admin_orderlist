const net = require("node:net");

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const normalizeIpAddress = (value) => String(value || "").trim().toLowerCase();

const normalizeDescription = (value) => {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const isValidIpOrCidr = (value) => {
  const normalized = normalizeIpAddress(value);
  if (!normalized) return false;

  if (net.isIP(normalized)) {
    return true;
  }

  const [ipAddress, prefix] = normalized.split("/");
  if (!ipAddress || typeof prefix === "undefined") {
    return false;
  }

  const version = net.isIP(ipAddress);
  const prefixNumber = Number(prefix);

  if (!version || !Number.isInteger(prefixNumber)) {
    return false;
  }

  const maxPrefix = version === 4 ? 32 : 128;
  return prefixNumber >= 0 && prefixNumber <= maxPrefix;
};

const validateCreatePayload = (payload) => {
  const ipAddress = normalizeIpAddress(payload?.ipAddress);
  const description = normalizeDescription(payload?.description);

  if (!ipAddress) {
    throw createHttpError(400, "IP whitelist không được để trống.");
  }

  if (!isValidIpOrCidr(ipAddress)) {
    throw createHttpError(400, "IP whitelist không hợp lệ.");
  }

  return {
    ipAddress,
    description,
  };
};

const validateUpdatePayload = (id, payload) => {
  const normalizedId = Number(id);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    throw createHttpError(400, "ID IP whitelist không hợp lệ.");
  }

  const hasIpAddress = Object.prototype.hasOwnProperty.call(payload || {}, "ipAddress");
  const hasDescription = Object.prototype.hasOwnProperty.call(payload || {}, "description");

  if (!hasIpAddress && !hasDescription) {
    throw createHttpError(400, "Không có dữ liệu để cập nhật.");
  }

  const updatePayload = {};

  if (hasIpAddress) {
    const ipAddress = normalizeIpAddress(payload?.ipAddress);
    if (!ipAddress) {
      throw createHttpError(400, "IP whitelist không được để trống.");
    }
    if (!isValidIpOrCidr(ipAddress)) {
      throw createHttpError(400, "IP whitelist không hợp lệ.");
    }
    updatePayload.ipAddress = ipAddress;
  }

  if (hasDescription) {
    updatePayload.description = normalizeDescription(payload?.description);
  }

  return {
    id: normalizedId,
    updatePayload,
  };
};

const validateDeletePayload = (id) => {
  const normalizedId = Number(id);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    throw createHttpError(400, "ID IP whitelist không hợp lệ.");
  }
  return normalizedId;
};

module.exports = {
  createHttpError,
  validateCreatePayload,
  validateUpdatePayload,
  validateDeletePayload,
};
