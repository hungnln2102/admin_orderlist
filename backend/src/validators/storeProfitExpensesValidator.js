const { body, param, query, validate } = require("../middleware/validateRequest");

const EXPENSE_TYPES = ["withdraw_profit", "external_import"];

const ymdRegex = /^\d{4}-\d{2}-\d{2}$/;

const listStoreProfitExpensesRules = [
  query("from")
    .optional()
    .matches(ymdRegex)
    .withMessage("from phải đúng định dạng yyyy-mm-dd."),
  query("to")
    .optional()
    .matches(ymdRegex)
    .withMessage("to phải đúng định dạng yyyy-mm-dd."),
  query("expense_type")
    .optional()
    .isIn(EXPENSE_TYPES)
    .withMessage("expense_type phải là withdraw_profit hoặc external_import."),
  validate,
];

const createStoreProfitExpenseRules = [
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("amount phải là số lớn hơn 0."),
  body("reason")
    .optional({ values: "null" })
    .custom((v) => v === null || v === undefined || typeof v === "string")
    .withMessage("reason không hợp lệ."),
  body("expense_type")
    .optional()
    .isIn(EXPENSE_TYPES)
    .withMessage("expense_type phải là withdraw_profit hoặc external_import."),
  validate,
];

const deleteStoreProfitExpenseRules = [
  param("id").isInt({ min: 1 }).withMessage("id không hợp lệ."),
  validate,
];

module.exports = {
  listStoreProfitExpensesRules,
  createStoreProfitExpenseRules,
  deleteStoreProfitExpenseRules,
};
