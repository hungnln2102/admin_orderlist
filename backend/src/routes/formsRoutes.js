const express = require("express");
const { listForms } = require("../controllers/FormDescController");

const router = express.Router();

// Lấy danh sách form từ bảng form_name
router.get("/forms", listForms);

module.exports = router;

