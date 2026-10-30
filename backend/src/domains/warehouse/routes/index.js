const express = require("express");
const controller = require("../controllers/warehouseController");

const router = express.Router();

router.get("/", controller.getWarehouseAccounts);
router.post("/", controller.createWarehouseAccount);
router.delete("/:id", controller.deleteWarehouseAccount);
router.put("/accounts/:id", controller.updateWarehouseAccount);

router.get("/system-products", controller.getSystemProducts);
router.get("/catalog", controller.getCatalogItems);
router.post("/catalog", controller.createCatalogItem);
router.delete("/catalog/:id", controller.deleteCatalogItem);
router.put("/catalog/:id", controller.updateCatalogItem);
router.post("/accounts/:id/open-browser", controller.openAccountBrowser);
router.post("/accounts/:id/services", controller.addServiceSlotToAccount);
router.put("/services/:id", controller.updateWarehouseServiceSlot);
router.delete("/services/:id", controller.deleteWarehouseServiceSlot);

module.exports = router;
