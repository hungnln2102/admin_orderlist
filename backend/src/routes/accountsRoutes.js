const express = require("express");
const { listAccounts } = require("../controllers/AccountsController");

const router = express.Router();

// Lấy danh sách tài khoản + role (dùng cho bảng CTV, tab theo role)
router.get("/accounts", listAccounts);

module.exports = router;

