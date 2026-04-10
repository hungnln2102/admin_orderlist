const express = require("express");
const {
  listWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} = require("../controllers/WarehouseController");
const { warehouseIdParam } = require("../validators/warehouseValidator");

const router = express.Router();

router.get("/", listWarehouse);
router.post("/", createWarehouse);
router.put("/:id", ...warehouseIdParam, updateWarehouse);
router.delete("/:id", ...warehouseIdParam, deleteWarehouse);

module.exports = router;
