const express = require("express");
const { listDailyBalances, saveDailyBalance } = require("../controllers/WalletsController");
const { saveDailyBalanceRules } = require("../validators/walletValidator");

const router = express.Router();

router.get("/wallets/daily-balances", listDailyBalances);
router.post("/wallets/daily-balances", ...saveDailyBalanceRules, saveDailyBalance);

module.exports = router;
