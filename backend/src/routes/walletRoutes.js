const express = require("express");
const {
  listDailyBalances,
  saveDailyBalance,
  createWalletType,
  updateWalletType,
  deleteWalletType,
} = require("../controllers/WalletsController");
const {
  saveDailyBalanceRules,
  createWalletTypeRules,
  updateWalletTypeRules,
  deleteWalletTypeRules,
} = require("../validators/walletValidator");

const router = express.Router();

router.get("/wallets/daily-balances", listDailyBalances);
router.post("/wallets/daily-balances", ...saveDailyBalanceRules, saveDailyBalance);

router.post("/wallets/types", ...createWalletTypeRules, createWalletType);
router.patch("/wallets/types/:id", ...updateWalletTypeRules, updateWalletType);
router.delete("/wallets/types/:id", ...deleteWalletTypeRules, deleteWalletType);

module.exports = router;
