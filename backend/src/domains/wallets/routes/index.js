/**
 * routes/index.js (V2 Wallets Domain)
 * Định tuyến API cho Bank Accounts & USDT Wallets
 */
const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");

// --- Bank Accounts Routes ---
// Legacy / compatibility aliases
router.get("/shop-bank-accounts", walletController.getBankAccounts);
router.post("/shop-bank-accounts", walletController.createBankAccount);
router.put("/shop-bank-accounts/:id", walletController.updateBankAccount);
router.post("/shop-bank-accounts/:id/set-default", walletController.setDefaultBankAccount);
router.delete("/shop-bank-accounts/:id", walletController.deleteBankAccount);
router.post("/shop-bank-accounts/:id/withdraw", walletController.recordBankWithdrawal);

// --- USDT Wallets Routes ---
router.get("/usdt-wallets", walletController.getUsdtWallets);
router.get("/usdt-wallets/exchange-rate", walletController.getUsdtExchangeRate);
router.post("/usdt-wallets", walletController.createUsdtWallet);
router.put("/usdt-wallets/:id", walletController.updateUsdtWallet);
router.post("/usdt-wallets/:id/set-default", walletController.setDefaultUsdtWallet);
router.delete("/usdt-wallets/:id", walletController.deleteUsdtWallet);
router.post("/usdt-wallets/:id/withdraw", walletController.recordUsdtWithdrawal);

module.exports = router;
