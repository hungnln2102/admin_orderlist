const path = require("path");
const dotenv = require("dotenv");

// Load env from backend root
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const port = Number(process.env.PORT) || 3001;
const SEPAY_PORT = Number(process.env.SEPAY_PORT) || 5000;
const SEPAY_HOST = process.env.SEPAY_HOST || "0.0.0.0";

const normalizeOrigin = (origin) => {
  if (typeof origin !== "string") {
    return "";
  }

  const trimmedOrigin = origin.trim();
  if (!trimmedOrigin) {
    return "";
  }

  try {
    return new URL(trimmedOrigin).origin.toLowerCase();
  } catch {
    return trimmedOrigin.replace(/\/+$/, "").toLowerCase();
  }
};

const allowedOrigins = Array.from(
  new Set(
    (process.env.FRONTEND_ORIGINS ||
      "http://localhost:5173,http://localhost:4001")
      .split(",")
      .map(normalizeOrigin)
      .filter(Boolean)
  )
);
const allowedOriginSet = new Set(allowedOrigins);

const sessionName =
  process.env.SESSION_NAME ||
  `${(process.env.APP_NAME || "session").replace(/[^a-z0-9]/gi, "").toLowerCase() || "session"}.sid`;
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

/** % thuế ước tính trên doanh thu tháng (ô "Thuế của tháng" dashboard). 0 = 0 ₫. */
const rawDashboardTax = process.env.DASHBOARD_MONTHLY_TAX_RATE_PERCENT;
const parsedDashboardTax =
  rawDashboardTax === undefined || String(rawDashboardTax).trim() === ""
    ? 0
    : Number(rawDashboardTax);
const dashboardMonthlyTaxRatePercent = Number.isFinite(parsedDashboardTax)
  ? Math.min(100, Math.max(0, parsedDashboardTax))
  : 0;

// Validate SESSION_SECRET in production
const sessionSecret = process.env.SESSION_SECRET || "change_this_secret";
if (isProd && (!process.env.SESSION_SECRET || sessionSecret === "change_this_secret")) {
  const logger = require("../utils/logger");
  logger.error(
    "[SECURITY] SESSION_SECRET không được set hoặc đang dùng default value trong production!"
  );
  logger.error(
    "[SECURITY] Vui lòng set SESSION_SECRET mạnh trong environment variables."
  );
  // In production, we should fail fast, but for backward compatibility, we'll warn
  // Uncomment the line below to enforce strict validation:
  // throw new Error("SESSION_SECRET is required in production and must not be default value");
}

module.exports = {
  port,
  allowedOrigins,
  allowedOriginSet,
  normalizeOrigin,
  dashboardMonthlyTaxRatePercent,
  sepay: {
    host: SEPAY_HOST,
    port: SEPAY_PORT,
  },
  session: {
    name: sessionName,
    secret: sessionSecret,
    cookieSecure,
    cookieSameSite,
  },
};
