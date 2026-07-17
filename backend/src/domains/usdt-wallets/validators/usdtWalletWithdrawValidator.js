const { createHttpError } = require("@/domains/usdt-wallets/validators/usdtWalletValidator");

const validateWithdrawPayload = (id, payload) => {
  const normalizedId = Number(id);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    throw createHttpError(400, "ID ví không hợp lệ.");
  }

  const amount = Number(payload?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw createHttpError(400, "Số tiền rút phải lớn hơn 0.");
  }

  return { id: normalizedId, amount: Math.round(amount * 10000) / 10000 };
};

module.exports = { validateWithdrawPayload };
