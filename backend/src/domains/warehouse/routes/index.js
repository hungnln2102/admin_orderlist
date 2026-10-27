const express = require("express");
const controller = require("../controllers/warehouseController");

const router = express.Router();

router.get("/", controller.getWarehouseAccounts);
router.post("/", controller.createWarehouseAccount);
router.delete("/:id", controller.deleteWarehouseAccount);
router.put("/accounts/:id", controller.updateWarehouseAccount);

router.get("/catalog", controller.getCatalogItems);
router.post("/catalog", controller.createCatalogItem);
router.delete("/catalog/:id", controller.deleteCatalogItem);
router.post("/accounts/:id/open-browser", controller.openAccountBrowser);
router.put("/services/:id", controller.updateWarehouseServiceSlot);

module.exports = router;
