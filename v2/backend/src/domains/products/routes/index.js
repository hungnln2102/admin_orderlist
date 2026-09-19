const express = require("express");
const productController = require("../controllers/productController");

const router = express.Router();

router.get("/prices", productController.getProductPrices);
router.get("/all-suppliers", productController.getAllSuppliersList);
router.get("/:productId/suppliers", productController.getSuppliersForVariant);

router.post("/", productController.createProduct);
router.put("/:productId", productController.updateProduct);
router.delete("/:productId", productController.deleteProduct);

router.post("/:productId/suppliers", productController.addSupplierCost);
router.delete("/suppliers/:supplierCostId", productController.deleteSupplierCost);

router.get("/", productController.getProductPrices);

module.exports = router;
