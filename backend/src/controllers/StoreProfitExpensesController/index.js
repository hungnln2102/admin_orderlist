const { listStoreProfitExpenses } = require("./listStoreProfitExpenses");
const { createStoreProfitExpense } = require("./createStoreProfitExpense");
const { updateStoreProfitExpense } = require("./updateStoreProfitExpense");
const { deleteStoreProfitExpense } = require("./deleteStoreProfitExpense");

module.exports = {
  listStoreProfitExpenses,
  createStoreProfitExpense,
  updateStoreProfitExpense,
  deleteStoreProfitExpense,
};
