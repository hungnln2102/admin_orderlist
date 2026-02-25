const express = require("express");
const authRoutes = require("./authRoutes");
const systemRoutes = require("./systemRoutes");
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
const testTelegramRoutes = require("./testTelegram");
const accountsRoutes = require("./accountsRoutes");
const promotionCodesRoutes = require("./promotionCodesRoutes");
const formsRoutes = require("./formsRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/test-telegram", testTelegramRoutes);
router.use("/", systemRoutes);

router.use(authGuard);

router.use("/dashboard", dashboardRoutes);
router.use("/", accountsRoutes);
router.use("/", promotionCodesRoutes);
router.use("/", formsRoutes);
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
