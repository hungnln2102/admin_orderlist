const app = require("./app");
const { port, sepay } = require("./config/appConfig");
const { ensureDefaultAdmin } = require("./controllers/AuthController");
// Ensure scheduler boots cron tasks
const scheduler = require("../scheduler"); // eslint-disable-line no-unused-vars
const sepayWebhookApp = require("../webhook/sepay_webhook");

ensureDefaultAdmin().catch((err) =>
  console.error("[AUTH] ensureDefaultAdmin thất bại:", err)
);

const server = app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});

/** Playwright / Google login-check có thể > 5 phút; tránh Node cắt request (requestTimeout mặc định 300s). */
const LONG_MS = 900_000;
server.requestTimeout = LONG_MS;
server.headersTimeout = LONG_MS + 10_000;
server.keepAliveTimeout = 120_000;

// Start Sepay webhook server alongside backend API
sepayWebhookApp.listen(sepay.port, sepay.host, () => {
  console.log(
    `Sepay webhook listening at http://${sepay.host}:${sepay.port}/api/payment/notify`
  );
});

module.exports = app;
