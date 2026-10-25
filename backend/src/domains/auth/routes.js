const express = require("express");
const { login, logout, me, changePassword } = require("./controller");
const { requireAuthenticatedUser } = require("./middleware/requireAuthenticatedUser");
const { loginRateLimiter } = require("./middleware/loginRateLimiter");

const router = express.Router();

router.post("/login", loginRateLimiter, login);
router.use(requireAuthenticatedUser);
router.post("/logout", logout);
router.get("/me", me);
router.post("/change-password", changePassword);

module.exports = router;
