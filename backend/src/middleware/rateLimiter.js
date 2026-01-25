/**
 * Rate Limiting Middleware
 * Protects endpoints from brute force attacks and abuse
 * 
 * @module middleware/rateLimiter
 */

const rateLimit = require("express-rate-limit");

/**
 * General API rate limiter
 * Limits all API requests to prevent abuse
 * 
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 * @description Limits each IP to 500 requests per 15 minutes (increased for development)
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs (increased from 100)
  message: {
    error: "Quá nhiều requests từ IP này, vui lòng thử lại sau 15 phút.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login
 * 
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 * @description Limits each IP to 30 login attempts per 15 minutes (increased for development)
 * Only counts failed requests (skipSuccessfulRequests: true)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 login requests per windowMs (increased from 5)
  message: {
    error: "Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false, // Count failed requests
});

/**
 * Moderate rate limiter for sensitive operations
 * For endpoints like password change, etc.
 * 
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 * @description Limits each IP to 50 requests per hour (increased for development)
 */
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 requests per hour (increased from 10)
  message: {
    error: "Quá nhiều requests cho thao tác này. Vui lòng thử lại sau 1 giờ.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  sensitiveLimiter,
};
