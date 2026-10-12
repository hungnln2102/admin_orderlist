const express = require("express");
const controller = require("../controllers/warehouseController");

const router = express.Router();

router.get("/", controller.getWarehouseAccounts);
router.post("/", controller.createWarehouseAccount);
router.delete("/:id", controller.deleteWarehouseAccount);

router.get("/catalog", controller.getCatalogItems);
router.post("/catalog", controller.createCatalogItem);

module.exports = router;
