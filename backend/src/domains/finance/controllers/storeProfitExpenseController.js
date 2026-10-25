/**
 * storeProfitExpenseController.js
 */
const expenseService = require("../services/storeProfitExpenseService");

async function getAvailableAccounts(req, res, next) {
  try {
    const accounts = await expenseService.listAvailablePaymentAccounts();
    res.json({ success: true, items: accounts });
  } catch (err) {
    next(err);
  }
}

async function listExpenses(req, res, next) {
  try {
    const { month, type, search, page, limit } = req.query;
    const result = await expenseService.listExpenses({
      month,
      expenseType: type,
      search,
      page,
      limit,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function createExpense(req, res, next) {
  try {
    const created = await expenseService.createExpense(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

async function updateExpense(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await expenseService.updateExpense(id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function deleteExpense(req, res, next) {
  try {
    const { id } = req.params;
    const result = await expenseService.deleteExpense(id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAvailableAccounts,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
};
