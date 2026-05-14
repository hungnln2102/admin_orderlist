const express = require("express");
const {
  listProductPrices,
  getProductPriceById,
  createProductPrice,
  updateProductPrice,
  toggleProductPriceStatus,
  deleteProductPrice,
  createSupplyPriceForProduct,
} = require("../../controllers/ProductsController");
const {
  productIdParam,
  createProductPriceRules,
  updateProductPriceRules,
} = require("../../validators/productValidator");

const router = express.Router();

router.get("/", listProductPrices);
router.post("/", ...createProductPriceRules, createProductPrice);
router.get("/:productId", ...productIdParam, getProductPriceById);
router.patch("/:productId/status", ...productIdParam, toggleProductPriceStatus);
router.patch("/:productId", ...updateProductPriceRules, updateProductPrice);
router.delete("/:productId", ...productIdParam, deleteProductPrice);
router.post("/:productId/suppliers", ...productIdParam, createSupplyPriceForProduct);

module.exports = router;
