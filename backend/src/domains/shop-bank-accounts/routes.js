const express = require("express");
const {
  listShopBankAccounts,
  getDefaultShopBankAccountHandler,
  createShopBankAccount,
  updateShopBankAccount,
  setDefaultShopBankAccount,
  removeShopBankAccount,
} = require("./controller");
const { createShopBankAccountRules } = require("./validators/shopBankAccountValidator");

const router = express.Router();

router.get("/", listShopBankAccounts);
router.get("/default", getDefaultShopBankAccountHandler);
router.post("/", ...createShopBankAccountRules, createShopBankAccount);
router.put("/:id", updateShopBankAccount);
router.post("/:id/set-default", setDefaultShopBankAccount);
router.delete("/:id", removeShopBankAccount);

module.exports = router;
