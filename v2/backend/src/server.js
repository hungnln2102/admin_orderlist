require("module-alias/register");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const PgSessionStore = require("connect-pg-simple")(session);
const crypto = require("crypto");
const { PORT, DATABASE_URL } = require("@/config/env");
const { db, SCHEMAS } = require("@/db");
const { registerAllSubscribers } = require("@/events");
const { requireAuthenticatedUser } = require("@/domains/auth/middleware/requireAuthenticatedUser");
const { getClientErrorMessage } = require("@/utils/clientError");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const sessionSecret = process.env.SESSION_SECRET || (!isProduction ? crypto.randomBytes(32).toString("hex") : "");

if (isProduction && (!sessionSecret || allowedOrigins.length === 0 || !process.env.SEPAY_API_KEY)) {
  throw new Error("SESSION_SECRET, CORS_ORIGINS và SEPAY_API_KEY là bắt buộc khi chạy production.");
}

const isAllowedOrigin = (origin) =>
  !origin || (!isProduction && allowedOrigins.length === 0) || allowedOrigins.includes(origin);

app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-site",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  });
  if (isProduction) {
    res.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  next();
});

app.use((req, res, next) => {
  if (isAllowedOrigin(req.get("Origin"))) return next();
  return res.status(403).json({ error: "Origin không được phép truy cập API." });
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.use(
  session({
    name: "admin_orderlist_v2.sid",
    secret: sessionSecret,
    store: new PgSessionStore({
      conString: DATABASE_URL,
      schemaName: SCHEMAS.ADMIN,
      tableName: "user_sessions",
      pruneSessionInterval: 60 * 15,
      errorLog: (...args) => console.error("[SessionStore]", ...args),
    }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Khởi chạy và đăng ký Event Subscribers & Cron Scheduler khi khởi động Server
registerAllSubscribers();
require("@/domains/system/services/systemConfigService").initCache();
require("@/scheduler").initScheduler().catch((error) => console.error("[Scheduler] Không thể khởi tạo:", error));

// Health Check Endpoint
app.get("/api/health", async (req, res) => {
  try {
    await db.raw("SELECT 1");
    res.json({
      status: "ok",
      version: "2.0.0",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Health] Database check failed:", err.message);
    res.status(500).json({
      status: "error",
      version: "2.0.0",
      database: "disconnected",
    });
  }
});

app.use("/api/auth", require("@/domains/auth/routes"));
app.use("/api/webhooks", require("@/domains/webhooks/routes"));
app.use("/api", requireAuthenticatedUser);

// Domain Routers
app.use("/api/orders", require("@/domains/orders/routes"));
app.use("/api/products", require("@/domains/products/routes"));
app.use("/api/suppliers", require("@/domains/suppliers/routes"));
app.use("/api/invoices", require("@/domains/invoices/routes"));
app.use("/api/credits", require("@/domains/credits/routes"));
app.use("/api/wallets", require("@/domains/wallets/routes"));
app.use("/api/system", require("@/domains/system/routes"));
app.use("/api/dashboard", require("@/domains/dashboard/routes"));
app.use("/api/warehouse", require("@/domains/warehouse/routes"));
app.use("/api/finance", require("@/domains/finance/routes/financeHubRoutes"));
app.use("/api/traffic", require("@/domains/traffic/routes/trafficRoutes"));

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Không tìm thấy API." });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, error: "Dữ liệu JSON không hợp lệ.", message: "Dữ liệu JSON không hợp lệ." });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ success: false, error: "Dữ liệu gửi lên quá lớn.", message: "Dữ liệu gửi lên quá lớn." });
  }

  console.error(`[API] ${req.method} ${req.originalUrl} failed:`, err);
  const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  const message = getClientErrorMessage(err, "Đã xảy ra lỗi máy chủ, vui lòng thử lại sau.");
  return res.status(status).json({ success: false, error: message, message });
});

app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 Admin Order List V2 Backend running on port ${PORT}`);
  console.log(`=================================`);
});

module.exports = app;
