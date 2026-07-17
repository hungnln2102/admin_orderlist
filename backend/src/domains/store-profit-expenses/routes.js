const express = require("express");
const {
  listStoreProfitExpenses,
  createStoreProfitExpense,
  updateStoreProfitExpense,
  deleteStoreProfitExpense,
} = require("@/domains/store-profit-expenses/controller");
const {
  listStoreProfitExpensesRules,
  createStoreProfitExpenseRules,
  updateStoreProfitExpenseRules,
  deleteStoreProfitExpenseRules,
} = require("@/domains/store-profit-expenses/validators/storeProfitExpensesValidator");

const router = express.Router();

router.get("/", ...listStoreProfitExpensesRules, listStoreProfitExpenses);
router.post("/", ...createStoreProfitExpenseRules, createStoreProfitExpense);
router.patch("/:id", ...updateStoreProfitExpenseRules, updateStoreProfitExpense);
router.delete("/:id", ...deleteStoreProfitExpenseRules, deleteStoreProfitExpense);

module.exports = router;
