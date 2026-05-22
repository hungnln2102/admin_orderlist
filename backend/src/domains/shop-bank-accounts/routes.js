const express = require("express");
const {
  listShopBankAccounts,
  getDefaultShopBankAccountHandler,
  createShopBankAccount,
  updateShopBankAccount,
  setDefaultShopBankAccount,
  removeShopBankAccount,
  listShopBankAccountBalancesHandler,
  patchShopBankAccountWithdrawn,
} = require("./controller");
const { createShopBankAccountRules } = require("./validators/shopBankAccountValidator");

const router = express.Router();

router.get("/", listShopBankAccounts);
router.get("/balances", listShopBankAccountBalancesHandler);
router.get("/default", getDefaultShopBankAccountHandler);
router.post("/", ...createShopBankAccountRules, createShopBankAccount);
router.put("/:id", updateShopBankAccount);
router.patch("/:id/withdrawn", patchShopBankAccountWithdrawn);
router.post("/:id/set-default", setDefaultShopBankAccount);
router.delete("/:id", removeShopBankAccount);

module.exports = router;
