require("module-alias/register");
const express = require("express");
const cors = require("cors");
const { PORT } = require("@/config/env");
const { db } = require("@/db");
const { registerAllSubscribers } = require("@/events");

const app = express();

app.use(cors());
app.use(express.json());

// Khởi chạy và đăng ký Event Subscribers khi khởi động Server
registerAllSubscribers();

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
app.use("/api/orders", require("@/domains/orders/routes"));
app.use("/api/products", require("@/domains/products/routes"));

app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 Admin Order List V2 Backend running on port ${PORT}`);
  console.log(`=================================`);
});

module.exports = app;
