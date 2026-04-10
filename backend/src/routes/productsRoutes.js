const express = require("express");
const {
  listProducts,
  listProductPackages,
  getSuppliesByProductName,
  getSupplyPricesByProductName,
  updateSupplyPriceForProduct,
  deleteSupplyPriceForProduct,
} = require("../controllers/ProductsController");
const { sourceIdParam } = require("../validators/productValidator");

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

module.exports = router;
