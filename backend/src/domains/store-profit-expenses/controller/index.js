const { listStoreProfitExpenses } = require("@/domains/store-profit-expenses/controller/listStoreProfitExpenses");
const { createStoreProfitExpense } = require("@/domains/store-profit-expenses/controller/createStoreProfitExpense");
const { updateStoreProfitExpense } = require("@/domains/store-profit-expenses/controller/updateStoreProfitExpense");
const { deleteStoreProfitExpense } = require("@/domains/store-profit-expenses/controller/deleteStoreProfitExpense");

module.exports = {
  listStoreProfitExpenses,
  createStoreProfitExpense,
  updateStoreProfitExpense,
  deleteStoreProfitExpense,
};
