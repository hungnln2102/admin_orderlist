require("module-alias/register");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { PORT } = require("@/config/env");
const { db } = require("@/db");
const { registerAllSubscribers } = require("@/events");

const app = express();

app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);
app.use(express.json());

app.use(
  session({
    name: "admin_orderlist_v2.sid",
    secret: process.env.SESSION_SECRET || "v2_secret_key_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Khởi chạy và đăng ký Event Subscribers & Cron Scheduler khi khởi động Server
registerAllSubscribers();
require("@/scheduler");

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
    res.status(500).json({
      status: "error",
      version: "2.0.0",
      database: "disconnected",
      error: err.message,
    });
  }
});

// Domain Routers
app.use("/api/auth", require("@/domains/auth/routes"));
app.use("/api/orders", require("@/domains/orders/routes"));
app.use("/api/products", require("@/domains/products/routes"));
app.use("/api/suppliers", require("@/domains/suppliers/routes"));
app.use("/api/webhooks", require("@/domains/webhooks/routes"));
app.use("/api/credits", require("@/domains/credits/routes"));
app.use("/api/wallets", require("@/domains/wallets/routes"));

app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 Admin Order List V2 Backend running on port ${PORT}`);
  console.log(`=================================`);
});

module.exports = app;
