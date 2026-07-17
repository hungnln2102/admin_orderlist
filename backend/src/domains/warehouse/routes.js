const express = require("express");
const {
  listWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} = require("@/domains/warehouse/controller");
const { warehouseIdParam } = require("@/domains/warehouse/validators/warehouseValidator");

const router = express.Router();

router.get("/", listWarehouse);
router.post("/", createWarehouse);
router.put("/:id", ...warehouseIdParam, updateWarehouse);
router.delete("/:id", ...warehouseIdParam, deleteWarehouse);

module.exports = router;
