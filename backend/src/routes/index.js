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
const categoriesRoutes = require("./categoriesRoutes");
const banksRoutes = require("./banksRoutes");
const packagesRoutes = require("./packagesRoutes");
const walletRoutes = require("./walletRoutes");
const warehouseRoutes = require("./warehouseRoutes");
const schedulerRoutes = require("./schedulerRoutes");
const { runSchedulerNow } = require("../controllers/SchedulerController");
const { authGuard } = require("../middleware/authGuard");

const router = express.Router();

router.use("/auth", authRoutes);

// Protect everything else
router.use(authGuard);

router.use("/dashboard", dashboardRoutes);
router.use("/orders", ordersRoutes);
router.use("/supplies", suppliesRoutes);
router.use("/", paymentsRoutes);
router.use("/products", productsRoutes);
router.use("/product-prices", productPricesRoutes);
router.use("/product-descriptions", productDescriptionsRoutes);
router.use("/categories", categoriesRoutes);
router.use("/banks", banksRoutes);
router.use("/package-products", packagesRoutes);
router.use("/", walletRoutes);
router.use("/warehouse", warehouseRoutes);
router.use("/warehouses", warehouseRoutes);
router.use("/scheduler", schedulerRoutes);
router.get("/run-scheduler", runSchedulerNow);
router.get("/supply-insights", suppliesController.getSupplyInsights);

module.exports = router;
