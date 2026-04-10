const { body, validate } = require("../middleware/validateRequest");

const saveDailyBalanceRules = [
  body("recordDate")
    .trim()
    .notEmpty()
    .withMessage("recordDate không hợp lệ."),
  body("values").isObject().withMessage("values không hợp lệ."),
  validate,
];

module.exports = { saveDailyBalanceRules };
