const express = require("express");
const authRoutes = require("./authRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const ordersRoutes = require("./ordersRoutes");
const suppliesRoutes = require("./suppliesRoutes");
const suppliesController = require("../controllers/SuppliesController");
const paymentsRoutes = require("./paymentsRoutes");
const productsRoutes = require("./productsRoutes");
const productPricesRoutes = require("./productPricesRoutes");
const productDescriptionsRoutes = require("./productDescriptionsRoutes");
const productImagesRoutes = require("./productImagesRoutes");
const categoriesRoutes = require("./categoriesRoutes");
const banksRoutes = require("./banksRoutes");
const packagesRoutes = require("./packagesRoutes");
const walletRoutes = require("./walletRoutes");
const warehouseRoutes = require("./warehouseRoutes");
const schedulerRoutes = require("./schedulerRoutes");
const savingGoalsController = require("../controllers/SavingGoalsController");
const { runSchedulerNow } = require("../controllers/SchedulerController");
const { authGuard } = require("../middleware/authGuard");

const router = express.Router();

router.use("/auth", authRoutes);

// Test endpoint for Telegram notifications (before auth for easy testing)
const testTelegramRoutes = require("./testTelegram");
router.use("/test-telegram", testTelegramRoutes);

// Frontend error reporting endpoint (before auth so it always works)
const { notifyError } = require("../utils/telegramErrorNotifier");
let lastFrontendReport = 0;
router.post("/error-report", (req, res) => {
  // Simple rate limit: 1 report per second
  const now = Date.now();
  if (now - lastFrontendReport < 1000) {
    return res.status(429).json({ ok: false });
  }
  lastFrontendReport = now;

  const { message, stack, url, extra } = req.body || {};
  if (!message) return res.status(400).json({ ok: false });

  notifyError({
    message: String(message).slice(0, 500),
    source: "frontend",
    url: String(url || "").slice(0, 200),
    stack: String(stack || "").slice(0, 500),
    extra: extra ? String(extra).slice(0, 200) : undefined,
  });

  res.json({ ok: true });
});

// Protect everything else
router.use(authGuard);

router.use("/dashboard", dashboardRoutes);
router.use("/orders", ordersRoutes);
router.use("/supplies", suppliesRoutes);
router.use("/", paymentsRoutes);
router.use("/products", productsRoutes);
router.use("/product-prices", productPricesRoutes);
router.use("/product-descriptions", productDescriptionsRoutes);
router.use("/product-images", productImagesRoutes);
router.use("/categories", categoriesRoutes);
router.use("/banks", banksRoutes);
router.use("/package-products", packagesRoutes);
router.use("/", walletRoutes);
router.use("/warehouse", warehouseRoutes);
router.use("/warehouses", warehouseRoutes);
router.use("/scheduler", schedulerRoutes);
router.get("/run-scheduler", runSchedulerNow);
router.get("/supply-insights", suppliesController.getSupplyInsights);
router.use("/saving-goals", savingGoalsController);

module.exports = router;
