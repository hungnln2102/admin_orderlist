const express = require("express");
const {
  listStoreProfitExpenses,
  createStoreProfitExpense,
  updateStoreProfitExpense,
  deleteStoreProfitExpense,
} = require("../../controllers/StoreProfitExpensesController");
const {
  listStoreProfitExpensesRules,
  createStoreProfitExpenseRules,
  updateStoreProfitExpenseRules,
  deleteStoreProfitExpenseRules,
} = require("../../validators/storeProfitExpensesValidator");

const router = express.Router();

router.get("/", ...listStoreProfitExpensesRules, listStoreProfitExpenses);
router.post("/", ...createStoreProfitExpenseRules, createStoreProfitExpense);
router.patch("/:id", ...updateStoreProfitExpenseRules, updateStoreProfitExpense);
router.delete("/:id", ...deleteStoreProfitExpenseRules, deleteStoreProfitExpense);

module.exports = router;
