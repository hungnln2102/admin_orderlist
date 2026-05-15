const express = require("express");
const { listAccounts } = require("./controller");

const router = express.Router();

// Lấy danh sách tài khoản + role (dùng cho bảng CTV, tab theo role)
router.get("/accounts", listAccounts);

module.exports = router;
