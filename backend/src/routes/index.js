/**
 * API router trung tâm.
 *
 * Các bounded context đã migrate mount trực tiếp từ `src/domains/<domain>/routes.js`.
 * Xem `src/domains/README.md`, `docs/STRUCTURE-SINGLE-DIRECTION.md`.
 */
const express = require("express");
const { runSchedulerNow } = require("../controllers/SchedulerController");
const { authGuard } = require("../middleware/authGuard");

const authRoutes = require("../domains/auth/routes");
const systemRoutes = require("../domains/system/routes");
const schedulerRoutes = require("../domains/scheduler/routes");
const testTelegramRoutes = require("../domains/test-telegram/routes");
const renewAdobeRoutes = require("../domains/renew-adobe/routes");
const { getRenewAdobeProxy } = require("../domains/renew-adobe/proxy");
const renewAdobePublicRoutes = require("../domains/renew-adobe/publicRoutes");

const dashboardRoutes = require("../domains/dashboard/routes");
const ordersRoutes = require("../domains/orders/routes");
const suppliesRoutes = require("../domains/supplies/routes");
const paymentsRoutes = require("../domains/payments/routes");
const productsRoutes = require("../domains/products/routes");
const productPricesRoutes = require("../domains/product-prices/routes");
const productDescriptionsRoutes = require("../domains/product-descriptions/routes");
const productImagesRoutes = require("../domains/product-images/routes");
const variantImagesRoutes = require("../domains/variant-images/routes");
const contentRoutes = require("../domains/content/routes");
const packagesRoutes = require("../domains/package-products/routes");
const walletRoutes = require("../domains/wallet/routes");
const publicContentRoutes = require("../domains/public-content/routes");
const publicPricingRoutes = require("../domains/public-pricing/routes");

const banksRoutes = require("../domains/banks/routes");
const categoriesRoutes = require("../domains/categories/routes");
const promotionCodesRoutes = require("../domains/promotion-codes/routes");
const formInfoRoutes = require("../domains/form-info/routes");
const customerStatusRoutes = require("../domains/customer-status/routes");
const accountsRoutes = require("../domains/accounts/routes");
const keyActiveRoutes = require("../domains/key-active/routes");
const warehouseRoutes = require("../domains/warehouse/routes");
const savingGoalsRoutes = require("../domains/saving-goals/routes");
const pricingTierRoutes = require("../domains/pricing-tiers/routes");
const storeProfitExpensesRoutes = require("../domains/store-profit-expenses/routes");
const ipWhitelistRoutes = require("../domains/ip-whitelist/routes");
const siteMaintenanceRoutes = require("../domains/site-maintenance/routes");
const longTimeout = (ms) => (req, res, next) => {
  req.setTimeout(ms);
  res.setTimeout(ms);
  next();
};

/** Tách process: xem `docs/renew-adobe-service.md` + `RENEW_ADOBE_API_BASE_URL`. */
const renewAdobeMount =
  (() => {
    const proxy = getRenewAdobeProxy();
    return proxy != null ? proxy : renewAdobeRoutes;
  })();

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/renew-adobe/public", renewAdobePublicRoutes);
const enableTestTelegramInProd =
  process.env.ENABLE_TEST_TELEGRAM === "true" || process.env.ENABLE_TEST_TELEGRAM === "1";
if (process.env.NODE_ENV !== "production" || enableTestTelegramInProd) {
  router.use("/test-telegram", testTelegramRoutes);
}
router.use("/", systemRoutes);

/** Tin tức công khai (storefront) — không cần đăng nhập */
router.use("/public/content", publicContentRoutes);
router.use("/public/pricing", publicPricingRoutes);

router.use(authGuard);

router.use("/dashboard", dashboardRoutes);
router.use("/form-info", formInfoRoutes);
router.use("/renew-adobe", longTimeout(900_000), renewAdobeMount);
router.use("/ip-whitelists", ipWhitelistRoutes);
router.use("/site-maintenance", siteMaintenanceRoutes);
router.use("/", customerStatusRoutes);
router.use("/", accountsRoutes);
router.use("/", promotionCodesRoutes);
router.use("/orders", ordersRoutes);
router.use("/supplies", suppliesRoutes);
router.use("/", paymentsRoutes);
router.use("/products", productsRoutes);
router.use("/product-prices", productPricesRoutes);
router.use("/product-descriptions", productDescriptionsRoutes);
router.use("/product-images", productImagesRoutes);
router.use("/variant-images", variantImagesRoutes);
router.use("/content", contentRoutes);
router.use("/categories", categoriesRoutes);
router.use("/banks", banksRoutes);
router.use("/package-products", packagesRoutes);
router.use("/", walletRoutes);
router.use("/key-active", keyActiveRoutes);
router.use("/warehouse", warehouseRoutes);
router.use("/warehouses", warehouseRoutes);
router.use("/scheduler", longTimeout(900_000), schedulerRoutes);
router.get("/run-scheduler", runSchedulerNow);
router.get("/supply-insights", suppliesRoutes.getSupplyInsights);
router.use("/saving-goals", savingGoalsRoutes);
router.use("/pricing-tiers", pricingTierRoutes);
router.use("/store-profit-expenses", storeProfitExpensesRoutes);

module.exports = router;
