const express = require("express");
const {
  listProductPrices,
  getProductPriceById,
  createProductPrice,
  updateProductPrice,
  toggleProductPriceStatus,
  deleteProductPrice,
  createSupplyPriceForProduct,
} = require("../controllers/productsController");

const router = express.Router();

router.get("/", listProductPrices);
router.post("/", createProductPrice);
router.get("/:productId", getProductPriceById);
router.patch("/:productId/status", toggleProductPriceStatus);
router.patch("/:productId", updateProductPrice);
router.delete("/:productId", deleteProductPrice);
router.post("/:productId/suppliers", createSupplyPriceForProduct);

module.exports = router;
