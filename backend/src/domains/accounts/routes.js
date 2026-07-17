const express = require("express");
const { listAccounts } = require("@/domains/accounts/controller");

const router = express.Router();

// Lấy danh sách tài khoản + role (dùng cho bảng CTV, tab theo role)
router.get("/accounts", listAccounts);

module.exports = router;
