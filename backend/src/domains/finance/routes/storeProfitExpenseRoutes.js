/**
 * storeProfitExpenseRoutes.js
 */
const express = require("express");
const router = express.Router();
const controller = require("../controllers/storeProfitExpenseController");

router.get("/accounts", controller.getAvailableAccounts);
router.get("/", controller.listExpenses);
router.post("/", controller.createExpense);
router.put("/:id", controller.updateExpense);
router.delete("/:id", controller.deleteExpense);

module.exports = router;
