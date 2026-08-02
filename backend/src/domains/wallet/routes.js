const express = require("express");
const {
  listDailyBalances,
  saveDailyBalance,
  createWalletType,
  updateWalletType,
  deleteWalletType,
} = require("@/domains/wallet/controller");
const {
  saveDailyBalanceRules,
  createWalletTypeRules,
  updateWalletTypeRules,
  deleteWalletTypeRules,
} = require("@/domains/wallet/validators/walletValidator");

const router = express.Router();

router.get("/wallets/daily-balances", listDailyBalances);
router.post("/wallets/daily-balances", ...saveDailyBalanceRules, saveDailyBalance);

router.post("/wallets/types", ...createWalletTypeRules, createWalletType);
router.patch("/wallets/types/:id", ...updateWalletTypeRules, updateWalletType);
router.delete("/wallets/types/:id", ...deleteWalletTypeRules, deleteWalletType);

// Sub-routes for financial accounts context
router.use("/shop-bank-accounts", require("./shop-bank-accounts/routes"));
router.use("/usdt-wallets", require("./usdt-wallets/routes"));

module.exports = router;
