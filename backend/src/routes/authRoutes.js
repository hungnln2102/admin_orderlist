const express = require("express");
const { login, logout, me, changePassword } = require("../controllers/AuthController");

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", me);
router.post("/change-password", changePassword);

module.exports = router;
