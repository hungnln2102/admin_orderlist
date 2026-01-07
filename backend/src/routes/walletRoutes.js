const express = require("express");
const { listDailyBalances, saveDailyBalance } = require("../controllers/WalletsController");

const router = express.Router();

router.get("/wallets/daily-balances", listDailyBalances);
router.post("/wallets/daily-balances", saveDailyBalance);

module.exports = router;
