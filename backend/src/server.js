require("module-alias/register");
const express = require("express");
let compression;
try {
  compression = require("compression");
} catch {
  // compression is optional middleware
}
const cors = require("cors");
const session = require("express-session");
const PgSessionStore = require("connect-pg-simple")(session);
const crypto = require("crypto");
const { PORT, DATABASE_URL } = require("@/config/env");
const { db, SCHEMAS } = require("@/db");
const { registerAllSubscribers } = require("@/events");
const { requireAuthenticatedUser } = require("@/domains/auth/middleware/requireAuthenticatedUser");
const { requireAdmin } = require("@/domains/auth/middleware/requireAdmin");
const { getClientErrorMessage } = require("@/utils/clientError");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "0" ? false : 1);
if (typeof compression === "function") {
  app.use(compression({ level: 6 }));
}
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = String(process.env.CORS_ORIGINS || process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const sessionSecret = process.env.SESSION_SECRET || (!isProduction ? crypto.randomBytes(32).toString("hex") : "");

if (isProduction && (!sessionSecret || allowedOrigins.length === 0 || !process.env.SEPAY_API_KEY)) {
  throw new Error("SESSION_SECRET, CORS_ORIGINS và SEPAY_API_KEY là bắt buộc khi chạy production.");
}

const defaultDevOrigins = ["http://localhost:3003", "http://127.0.0.1:3003", "http://localhost:5173", "http://127.0.0.1:5173"];
const isAllowedOrigin = (origin) =>
  !origin ||
  (!isProduction && (allowedOrigins.length === 0 || defaultDevOrigins.includes(origin))) ||
  allowedOrigins.includes(origin);

const requireTrustedMutationOrigin = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("Origin");
  if (origin && isAllowedOrigin(origin)) return next();
  return res.status(403).json({ error: "Trusted Origin is required for state-changing API requests." });
};

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

// Khởi chạy và đăng ký Event Subscribers, Cấu hình, Scheduler & Outbox Worker khi khởi động Server
registerAllSubscribers();
const systemConfigService = require("@/domains/system/services/systemConfigService");
const { initScheduler } = require("@/scheduler");
const { outboxDispatcherWorker } = require("@/domains/notifications");

async function bootstrapBackgroundServices() {
  try {
    await systemConfigService.initCache();
    await initScheduler();
    outboxDispatcherWorker.start(3000);
    const { startWorker: startVpbankWorker } = require("@/domains/finance/workers/vpbankImapWorker");
    void startVpbankWorker().catch((err) => {
      console.error("[Bootstrap] Lỗi khởi động VPBank IMAP Worker:", err.message);
    });
  } catch (error) {
    console.error("[Bootstrap] Lỗi khởi động background services:", error);
  }
}
bootstrapBackgroundServices();

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
// Backward-compatibility cho các endpoint webhook SePay cấu hình cũ từ V1
app.post(
  ["/api/payment/notify", "/webhook"],
  require("@/domains/webhooks/services/sepayAuth").requireSepayApiKey,
  require("@/domains/webhooks/controllers/webhookController").handleSePayWebhook
);
// Public API cho OTP Portal đọc cấu hình theme hiện hành & toàn bộ danh mục Themes SSOT
const { ALL_THEMES_CATALOG } = require("@/domains/system/constants/themeCatalog");
app.get(["/api/public/theme", "/api/public/themes"], async (req, res) => {
  try {
    const raw = systemConfigService.get("OTP_PORTAL_THEME");
    let config = { mode: "auto", theme: null };
    if (raw) {
      config = typeof raw === "string" ? JSON.parse(raw) : raw;
    }
    return res.json({ success: true, config, themes: ALL_THEMES_CATALOG });
  } catch (err) {
    console.error("[Public Theme API] Error:", err.message);
    return res.json({ success: true, config: { mode: "auto", theme: null }, themes: ALL_THEMES_CATALOG });
  }
});

// Public API cho OTP Portal đọc cấu hình gán API bên thứ 3 động vào các ô giao diện
const otpPortalDispatcher = require("@/domains/system/services/otpPortalDispatcher");

app.get("/api/public/otp-portal-slots", async (req, res) => {
  try {
    const slots = otpPortalDispatcher.getActiveSlots();
    return res.json({ success: true, slots });
  } catch (err) {
    console.error("[Public OTP Slots API] Error:", err.message);
    return res.json({ success: true, slots: otpPortalDispatcher.DEFAULT_SLOTS });
  }
});

// Tự động đồng bộ & đăng ký slots từ web otp_portal sang Backend & Admin
app.post(["/api/public/otp-portal-slots/register", "/api/public/otp-portal-slots/sync"], async (req, res) => {
  try {
    const incomingSlots = req.body?.slots || req.body;
    const updatedBy = req.session?.user?.username || "PORTAL_SYNC";
    const mergedSlots = await otpPortalDispatcher.registerSlotsFromPortal(incomingSlots, updatedBy);
    return res.json({
      success: true,
      message: `Đã đồng bộ ${mergedSlots.length} ô input từ Web OTP Portal thành công!`,
      slots: mergedSlots,
    });
  } catch (err) {
    console.error("[Public OTP Slots Sync API] Error:", err.message);
    return res.status(400).json({ success: false, error: err.message, message: err.message });
  }
});

// Dispatcher trung tâm cho mọi ô input trên OTP Portal & Live Test Admin
app.post("/api/public/otp/probe-slot", async (req, res) => {
  try {
    const slotKey = req.body?.slot_key || req.body?.slotKey;
    const input = req.body?.input || req.body?.email || req.body?.secret || req.body?.order_code;
    const result = await otpPortalDispatcher.dispatchSlotRequest({ slotKey, input });
    return res.json(result);
  } catch (err) {
    console.error("[Public OTP Probe API] Error:", err.message);
    return res.status(400).json({ success: false, error: err.message, message: err.message });
  }
});

// Các endpoint cụ thể từng dịch vụ (tương thích backward & link trực tiếp)
app.post("/api/public/otp/adobe/code", async (req, res) => {
  try {
    const input = req.body?.email || req.body?.input;
    const result = await otpPortalDispatcher.dispatchSlotRequest({ slotKey: "adobe_otp", input });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/public/otp/adobe/account", async (req, res) => {
  try {
    const input = req.body?.email || req.body?.order_code || req.body?.search || req.body?.input;
    const result = await otpPortalDispatcher.dispatchSlotRequest({ slotKey: "adobe_account", input });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/public/otp/gpt/account", async (req, res) => {
  try {
    const input = req.body?.email || req.body?.order_code || req.body?.search || req.body?.input;
    const result = await otpPortalDispatcher.dispatchSlotRequest({ slotKey: "gpt_account", input });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/public/otp/netflix/household", async (req, res) => {
  try {
    const input = req.body?.email || req.body?.input;
    const result = await otpPortalDispatcher.dispatchSlotRequest({ slotKey: "netflix_household", input });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/public/otp/netflix/six-digit", async (req, res) => {
  try {
    const input = req.body?.email || req.body?.input;
    const result = await otpPortalDispatcher.dispatchSlotRequest({ slotKey: "netflix_six_digit", input });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/public/otp/netflix/login-otp", async (req, res) => {
  try {
    const input = req.body?.email || req.body?.input;
    const result = await otpPortalDispatcher.dispatchSlotRequest({ slotKey: "netflix_login_otp", input });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/public/otp/gpt/code", async (req, res) => {
  try {
    const input = req.body?.email || req.body?.input;
    const result = await otpPortalDispatcher.dispatchSlotRequest({ slotKey: "gpt_otp", input });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/public/otp/2fa/generate", async (req, res) => {
  try {
    const input = req.body?.secret || req.body?.email || req.body?.input;
    const result = await otpPortalDispatcher.dispatchSlotRequest({ slotKey: "two_factor_totp", input });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

app.use("/api", requireAuthenticatedUser, requireAdmin);
app.use("/api", requireTrustedMutationOrigin);

// Domain Routers
app.use("/api/realtime", require("@/domains/realtime/routes"));
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
app.use("/api/store-profit-expenses", require("@/domains/finance/routes/storeProfitExpenseRoutes"));
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
  console.log(`🚀 Admin Order List Backend running on port ${PORT}`);
  console.log(`=================================`);
});

module.exports = app;
