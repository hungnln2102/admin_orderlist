const {
  listUsdtWallets,
  USDT_WALLETS_DEF,
} = require("@/domains/usdt-wallets/repositories/usdtWalletRepository");
const { createHttpError } = require("@/domains/usdt-wallets/validators/usdtWalletValidator");
const { toUsd } = require("@/domains/usdt-wallets/services/usdtWalletLedgerService");

const listUsdtWalletBalances = async () => {
  if (!USDT_WALLETS_DEF) {
    throw createHttpError(
      500,
      "Thiếu cấu hình bảng usdt_wallets trong ADMIN_SCHEMA."
    );
  }

  const wallets = await listUsdtWallets();

  return (wallets || []).map((wallet) => ({
    ...wallet,
    totalReceived: toUsd(wallet.totalReceived),
    totalWithdrawn: toUsd(wallet.totalWithdrawn),
    balanceRemaining: toUsd(wallet.balance),
  }));
};

module.exports = { listUsdtWalletBalances };
