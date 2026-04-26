/**
 * Một URL base cho Form thông tin: /api/form-info
 * - GET /form-info/forms     -> danh sách form
 * - GET /form-info/inputs    -> danh sách input
 * - GET /form-info/forms/:id -> chi tiết form
 * - PUT /form-info/forms/:id -> cập nhật form
 */
const express = require("express");
const {
  listForms,
  listInputs,
  getFormDetail,
  createInput,
  createForm,
  updateForm,
} = require("../controllers/FormDescController");
const { formIdParam, createFormRules, createInputRules } = require("../validators/formDescValidator");

const router = express.Router();

router.get("/forms", listForms);
router.get("/inputs", listInputs);
router.get("/forms/:formId", ...formIdParam, getFormDetail);
router.put("/forms/:formId", ...formIdParam, ...createFormRules, updateForm);
router.post("/forms", ...createFormRules, createForm);
router.post("/inputs", ...createInputRules, createInput);

module.exports = router;
