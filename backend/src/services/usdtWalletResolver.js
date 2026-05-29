const { findDefaultActiveUsdtWallet } = require("../domains/usdt-wallets/repositories/usdtWalletRepository");

const resolveDefaultUsdtWallet = async () => findDefaultActiveUsdtWallet();

module.exports = {
  resolveDefaultUsdtWallet,
};
