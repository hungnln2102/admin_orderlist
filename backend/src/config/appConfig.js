const path = require("path");
const dotenv = require("dotenv");

// Load env from backend root
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const port = Number(process.env.PORT) || 3001;
const SEPAY_PORT = Number(process.env.SEPAY_PORT) || 5000;
const SEPAY_HOST = process.env.SEPAY_HOST || "0.0.0.0";

const allowedOrigins = (process.env.FRONTEND_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isProd = process.env.NODE_ENV === "production";
const cookieSecureEnv = (process.env.COOKIE_SECURE || "").trim().toLowerCase();
const hasHttpOrigin = allowedOrigins.some((origin) =>
  origin.toLowerCase().startsWith("http://")
);

// Allow "auto" to support both HTTP (local) and HTTPS (prod) without breaking sessions.
// If a non-HTTPS origin is present, fall back to "auto" even when COOKIE_SECURE=true
// so that dev environments still receive the session cookie.
let cookieSecure =
  cookieSecureEnv === "auto"
    ? "auto"
    : cookieSecureEnv === "true" ||
      cookieSecureEnv === "1" ||
      (!cookieSecureEnv && isProd && !hasHttpOrigin);

if (cookieSecure === true && hasHttpOrigin) {
  cookieSecure = "auto";
}

const cookieSameSite = cookieSecure === true ? "none" : "lax";

module.exports = {
  port,
  allowedOrigins,
  sepay: {
    host: SEPAY_HOST,
    port: SEPAY_PORT,
  },
  session: {
    name: process.env.SESSION_NAME || "mavryk.sid",
    secret: process.env.SESSION_SECRET || "change_this_secret",
    cookieSecure,
    cookieSameSite,
  },
};
