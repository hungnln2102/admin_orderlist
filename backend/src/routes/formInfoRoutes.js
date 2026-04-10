/**
 * Một URL base cho Form thông tin: /api/form-info
 * - GET /form-info/forms     -> danh sách form
 * - GET /form-info/inputs    -> danh sách input
 * - GET /form-info/forms/:id -> chi tiết form
 */
const express = require("express");
const {
  listForms,
  listInputs,
  getFormDetail,
  createInput,
  createForm,
} = require("../controllers/FormDescController");
const { formIdParam, createFormRules, createInputRules } = require("../validators/formDescValidator");

const router = express.Router();

router.get("/forms", listForms);
router.get("/inputs", listInputs);
router.get("/forms/:formId", ...formIdParam, getFormDetail);
router.post("/forms", ...createFormRules, createForm);
router.post("/inputs", ...createInputRules, createInput);

module.exports = router;
