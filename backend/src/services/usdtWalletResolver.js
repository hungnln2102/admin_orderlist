const { findDefaultActiveUsdtWallet } = require("@/domains/wallet/usdt-wallets/repositories/usdtWalletRepository");

const resolveDefaultUsdtWallet = async () => findDefaultActiveUsdtWallet();

module.exports = {
  resolveDefaultUsdtWallet,
};
