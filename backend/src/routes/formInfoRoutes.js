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
} = require("../controllers/FormDescController");

const router = express.Router();

router.get("/forms", listForms);
router.get("/inputs", listInputs);
router.get("/forms/:formId", getFormDetail);

module.exports = router;
