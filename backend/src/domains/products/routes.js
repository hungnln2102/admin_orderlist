const express = require("express");
const {
  listProducts,
  listProductPackages,
  getSuppliesByProductName,
  getSupplyPricesByProductName,
  updateSupplyPriceForProduct,
  deleteSupplyPriceForProduct,
} = require("@/domains/products/controller");
const { sourceIdParam } = require("@/domains/products/validators/productValidator");

const router = express.Router();

router.get("/", listProducts);
router.get("/packages", listProductPackages);
router.get("/supplies-by-name/:productName", getSuppliesByProductName);
router.get("/all-prices-by-name/:productName", getSupplyPricesByProductName);
router.patch(
  "/:productId/suppliers/:sourceId/price",
  ...sourceIdParam,
  updateSupplyPriceForProduct,
);
router.delete(
  "/:productId/suppliers/:sourceId",
  ...sourceIdParam,
  deleteSupplyPriceForProduct,
);

// Sub-routes for products context
router.use("/prices", require("./prices/routes"));
router.use("/descriptions", require("./descriptions/routes"));
router.use("/images", require("./images/routes"));
router.use("/variant-images", require("./images/routes"));
router.use("/categories", require("./categories/routes"));
router.use("/packages", require("./packages/routes"));
router.use("/pricing-tiers", require("./pricing-tiers/routes"));

module.exports = router;
