const express = require("express");
const productController = require("../controllers/productController");

const router = express.Router();

router.get("/prices", productController.getProductPrices);
router.get("/packages", productController.getPackageProducts);
router.post("/packages", productController.createPackageProduct);
router.put("/packages/:id", productController.updatePackageProduct);
router.delete("/packages/:id", productController.deletePackageProduct);
router.get("/packages/categories", productController.getPackageCategories);
router.get("/packages/catalog-names", productController.getAllCatalogProductNames);
router.post("/packages/categories", productController.createPackageCategory);
router.put("/packages/categories", productController.updatePackageCategory);
router.delete("/packages/categories/:name", productController.deletePackageCategory);
router.get("/all-suppliers", productController.getAllSuppliersList);
router.get("/:productId/suppliers", productController.getSuppliersForVariant);

router.post("/", productController.createProduct);
router.put("/:productId", productController.updateProduct);
router.delete("/:productId", productController.deleteProduct);

router.post("/:productId/suppliers", productController.addSupplierCost);
router.put("/suppliers/:supplierCostId", productController.updateSupplierCost);
router.delete("/suppliers/:supplierCostId", productController.deleteSupplierCost);

module.exports = router;
