const express = require("express");
const {
  listWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  listProductNames,
  createProductName,
  updateProductName,
  deleteProductName,
} = require("@/domains/warehouse/controller");
const { warehouseIdParam } = require("@/domains/warehouse/validators/warehouseValidator");

const router = express.Router();

// Product names catalog
router.get("/product-names", listProductNames);
router.post("/product-names", createProductName);
router.put("/product-names/:id", updateProductName);
router.delete("/product-names/:id", deleteProductName);

// Warehouse
router.get("/", listWarehouse);
router.post("/", createWarehouse);
router.put("/:id", ...warehouseIdParam, updateWarehouse);
router.delete("/:id", ...warehouseIdParam, deleteWarehouse);

module.exports = router;
