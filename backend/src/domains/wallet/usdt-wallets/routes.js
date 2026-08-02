const express = require("express");
const {
  listUsdtWallets,
  getDefaultUsdtWalletHandler,
  getExchangeRateHandler,
  createUsdtWallet,
  updateUsdtWallet,
  setDefaultUsdtWallet,
  removeUsdtWallet,
  listUsdtWalletBalancesHandler,
  postUsdtWalletWithdraw,
} = require("@/domains/usdt-wallets/controller");
const { createUsdtWalletRules } = require("@/domains/usdt-wallets/validators/usdtWalletValidator");

const router = express.Router();

router.get("/", listUsdtWallets);
router.get("/balances", listUsdtWalletBalancesHandler);
router.get("/exchange-rate", getExchangeRateHandler);
router.get("/default", getDefaultUsdtWalletHandler);
router.post("/", ...createUsdtWalletRules, createUsdtWallet);
router.put("/:id", updateUsdtWallet);
router.post("/:id/withdraw", postUsdtWalletWithdraw);
router.post("/:id/set-default", setDefaultUsdtWallet);
router.delete("/:id", removeUsdtWallet);

module.exports = router;
