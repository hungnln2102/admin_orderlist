const express = require("express");
const {
  listProducts,
  getSuppliesByProductName,
  getSupplyPricesByProductName,
  updateSupplyPriceForProduct,
  deleteSupplyPriceForProduct,
} = require("../controllers/ProductsController");

const router = express.Router();

router.get("/", listProducts);
router.get("/supplies-by-name/:productName", getSuppliesByProductName);
router.get("/all-prices-by-name/:productName", getSupplyPricesByProductName);
router.patch(
  "/:productId/suppliers/:sourceId/price",
  updateSupplyPriceForProduct
);
router.delete(
  "/:productId/suppliers/:sourceId",
  deleteSupplyPriceForProduct
);

module.exports = router;
