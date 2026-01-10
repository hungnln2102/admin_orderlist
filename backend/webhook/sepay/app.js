const express = require("express");
const { SEPAY_WEBHOOK_PATH } = require("./config");
const webhookRoutes = require("./routes/webhook");
const renewalRoutes = require("./routes/renewals");

const app = express();

// Capture raw body for HMAC verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(SEPAY_WEBHOOK_PATH, webhookRoutes);
app.use("/api/renewals", renewalRoutes);

module.exports = app;
