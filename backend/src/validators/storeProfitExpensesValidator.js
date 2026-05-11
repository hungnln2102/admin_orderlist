const { body, param, query, validate } = require("../middleware/validateRequest");

/** Lọc GET — bao gồm mavn_import (đồng bộ đơn nhập). */
const EXPENSE_TYPES = ["withdraw_profit", "external_import", "mavn_import"];
/** POST — không cho tạo tay mavn_import (chỉ tự động). */
const EXPENSE_TYPES_CREATABLE = ["withdraw_profit", "external_import"];

const ymdRegex = /^\d{4}-\d{2}-\d{2}$/;

const expenseTypeListRegex = new RegExp(
  `^(?:${EXPENSE_TYPES.join("|")})(?:,(?:${EXPENSE_TYPES.join("|")}))*$`
);

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
    .matches(expenseTypeListRegex)
    .withMessage(
      "expense_type phải là withdraw_profit, external_import hoặc mavn_import (có thể nhiều, ngăn cách bằng dấu phẩy)."
    ),
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
    .isIn(EXPENSE_TYPES_CREATABLE)
    .withMessage("expense_type phải là withdraw_profit hoặc external_import."),
  body("linked_order_code")
    .optional({ values: "null" })
    .custom(
      (v) =>
        v === null ||
        v === undefined ||
        (typeof v === "string" && v.trim().length <= 64)
    )
    .withMessage("linked_order_code không hợp lệ (tối đa 64 ký tự)."),
  body("expense_meta")
    .optional({ values: "null" })
    .custom((v) => v === null || v === undefined || (typeof v === "object" && !Array.isArray(v)))
    .withMessage("expense_meta phải là object hoặc null."),
  validate,
];

const deleteStoreProfitExpenseRules = [
  param("id").isInt({ min: 1 }).withMessage("id không hợp lệ."),
  validate,
];

const updateStoreProfitExpenseRules = [
  param("id").isInt({ min: 1 }).withMessage("id không hợp lệ."),
  body("trace_code")
    .optional({ values: "null" })
    .custom(
      (v) =>
        v === null ||
        v === undefined ||
        (typeof v === "string" && v.trim().length <= 100)
    )
    .withMessage("trace_code không hợp lệ (tối đa 100 ký tự)."),
  body("traceCode")
    .optional({ values: "null" })
    .custom(
      (v) =>
        v === null ||
        v === undefined ||
        (typeof v === "string" && v.trim().length <= 100)
    )
    .withMessage("traceCode không hợp lệ (tối đa 100 ký tự)."),
  body("linked_order_code")
    .optional({ values: "null" })
    .custom(
      (v) =>
        v === null ||
        v === undefined ||
        (typeof v === "string" && v.trim().length <= 64)
    )
    .withMessage("linked_order_code không hợp lệ (tối đa 64 ký tự)."),
  body("reason")
    .optional({ values: "null" })
    .custom((v) => v === null || v === undefined || typeof v === "string")
    .withMessage("reason không hợp lệ."),
  validate,
];

module.exports = {
  listStoreProfitExpensesRules,
  createStoreProfitExpenseRules,
  updateStoreProfitExpenseRules,
  deleteStoreProfitExpenseRules,
};
