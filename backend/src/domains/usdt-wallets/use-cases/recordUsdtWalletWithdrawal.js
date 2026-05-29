const db = require("../../../db/knexClient");
const {
  USDT_WALLETS_DEF,
  findUsdtWalletById,
  TABLE,
  selectColumns,
  columns,
} = require("../repositories/usdtWalletRepository");
const {
  debitUsdtWalletWithdraw,
  SOURCE_KINDS,
  toUsd,
} = require("../services/usdtWalletLedgerService");
const { createHttpError } = require("../validators/usdtWalletValidator");
const { validateWithdrawPayload } = require("../validators/usdtWalletWithdrawValidator");

const normalizeOptionalText = (value) => {
  const text = String(value || "").trim();
  return text || null;
};

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
