const { createHttpError } = require("@/domains/shop-bank-accounts/validators/shopBankAccountValidator");

const parseWithdrawnAmount = (value) => {
  if (value == null || value === "") {
    throw createHttpError(400, "Số tiền đã rút là bắt buộc.");
  }
  const digits = String(value).replace(/[^\d]/g, "");
  if (!digits) {
    throw createHttpError(400, "Số tiền đã rút không hợp lệ.");
  }
  const amount = Number(digits);
  if (!Number.isFinite(amount) || amount < 0) {
    throw createHttpError(400, "Số tiền đã rút phải là số không âm.");
  }
  return Math.round(amount);
};

const validateWithdrawnPayload = (id, payload) => {
  const normalizedId = Number(id);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    throw createHttpError(400, "ID tài khoản không hợp lệ.");
  }

  const raw =
    payload?.totalWithdrawn ??
    payload?.total_withdrawn ??
    payload?.withdrawnAmount ??
    payload?.withdrawn_amount;

  return {
    id: normalizedId,
    totalWithdrawn: parseWithdrawnAmount(raw),
  };
};

const parseWithdrawAmount = (value) => {
  if (value == null || value === "") {
    throw createHttpError(400, "Số tiền rút là bắt buộc.");
  }
  const digits = String(value).replace(/[^\d]/g, "");
  if (!digits) {
    throw createHttpError(400, "Số tiền rút không hợp lệ.");
  }
  const amount = Number(digits);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw createHttpError(400, "Số tiền rút phải lớn hơn 0.");
  }
  return Math.round(amount);
};

const validateWithdrawPayload = (id, payload) => {
  const normalizedId = Number(id);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    throw createHttpError(400, "ID tài khoản không hợp lệ.");
  }

  const raw =
    payload?.amount ??
    payload?.withdrawAmount ??
    payload?.withdraw_amount;

  return {
    id: normalizedId,
    amount: parseWithdrawAmount(raw),
  };
};

module.exports = {
  parseWithdrawnAmount,
  parseWithdrawAmount,
  validateWithdrawnPayload,
  validateWithdrawPayload,
};
