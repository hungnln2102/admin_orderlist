const express = require("express");
const {
  login,
  logout,
  me,
  getCsrfToken,
  changePassword,
} = require("../controllers/AuthController");
const { authLimiter, sensitiveLimiter, apiLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// Apply rate limiting to authentication endpoints
router.post("/login", authLimiter, login);
router.post("/logout", logout); // Logout doesn't need strict rate limiting
router.get("/me", apiLimiter, me); // Apply general API limiter (more lenient)
router.get("/csrf-token", apiLimiter, getCsrfToken);
router.post("/change-password", sensitiveLimiter, changePassword);

module.exports = router;
