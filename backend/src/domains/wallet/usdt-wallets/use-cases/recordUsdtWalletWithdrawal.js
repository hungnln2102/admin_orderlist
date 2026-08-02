const db = require("@/db/knexClient");
const {
  USDT_WALLETS_DEF,
  findUsdtWalletById,
} = require("@/domains/wallet/usdt-wallets/repositories/usdtWalletRepository");
const {
  debitUsdtWalletWithdraw,
  SOURCE_KINDS,
  toUsd,
} = require("@/domains/wallet/usdt-wallets/services/usdtWalletLedgerService");
const { createHttpError } = require("@/domains/wallet/usdt-wallets/validators/usdtWalletValidator");
const { validateWithdrawPayload } = require("@/domains/wallet/usdt-wallets/validators/usdtWalletWithdrawValidator");
const { normalizeOptionalText } = require("@/domains/wallet/usdt-wallets/helpers/usdtWalletInputs");


const recordUsdtWalletWithdrawal = async (id, payload) => {
  if (!USDT_WALLETS_DEF) {
    throw createHttpError(
      500,
      "Thiếu cấu hình bảng usdt_wallets trong ADMIN_SCHEMA."
    );
  }

  const { id: normalizedId, amount } = validateWithdrawPayload(id, payload);
  const reason = normalizeOptionalText(payload?.reason);
  const current = await findUsdtWalletById(normalizedId);
  if (!current) {
    throw createHttpError(404, "Không tìm thấy ví.");
  }

  const withdrawId = `withdraw-${Date.now()}-${normalizedId}`;

  await db.transaction(async (trx) => {
    await debitUsdtWalletWithdraw(trx, {
      walletId: normalizedId,
      amount,
      sourceKind: SOURCE_KINDS.MANUAL_WITHDRAW,
      sourceId: withdrawId,
      note: reason,
    });
  });

  const updated = await findUsdtWalletById(normalizedId);
  return {
    ...updated,
    totalReceived: toUsd(updated?.totalReceived),
    totalWithdrawn: toUsd(updated?.totalWithdrawn),
    balanceRemaining: toUsd(updated?.balance),
    withdrawnAmount: amount,
  };
};

module.exports = { recordUsdtWalletWithdrawal };
