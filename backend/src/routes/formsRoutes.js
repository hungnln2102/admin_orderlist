const express = require("express");
const {
  listForms,
  getFormDetail,
} = require("../controllers/FormDescController");

const router = express.Router();

// Lấy danh sách form từ bảng form_name
router.get("/", listForms);
// Lấy chi tiết một form (input-list xử lý ở index.js để tránh trùng)
router.get("/:formId", getFormDetail);

module.exports = router;

