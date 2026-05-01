const express = require("express");
const {
  listStoreProfitExpenses,
  createStoreProfitExpense,
  deleteStoreProfitExpense,
} = require("../../controllers/StoreProfitExpensesController");
const {
  listStoreProfitExpensesRules,
  createStoreProfitExpenseRules,
  deleteStoreProfitExpenseRules,
} = require("../../validators/storeProfitExpensesValidator");

const router = express.Router();

router.get("/", ...listStoreProfitExpensesRules, listStoreProfitExpenses);
router.post("/", ...createStoreProfitExpenseRules, createStoreProfitExpense);
router.delete("/:id", ...deleteStoreProfitExpenseRules, deleteStoreProfitExpense);

module.exports = router;
