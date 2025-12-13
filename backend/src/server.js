const app = require("./app");
const { port, sepay } = require("./config/appConfig");
const { ensureDefaultAdmin } = require("./controllers/authController");
// Ensure scheduler boots cron tasks
const scheduler = require("../scheduler"); // eslint-disable-line no-unused-vars
const sepayWebhookApp = require("../webhook/sepay_webhook");

ensureDefaultAdmin().catch((err) =>
  console.error("[AUTH] ensureDefaultAdmin failed:", err)
);

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});

// Start Sepay webhook server alongside backend API
sepayWebhookApp.listen(sepay.port, sepay.host, () => {
  console.log(
    `Sepay webhook listening at http://${sepay.host}:${sepay.port}/api/payment/notify`
  );
});

module.exports = app;
