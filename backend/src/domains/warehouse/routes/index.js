const express = require("express");
const controller = require("../controllers/warehouseController");

const router = express.Router();

router.get("/", controller.getWarehouseAccounts);
router.post("/", controller.createWarehouseAccount);
router.delete("/:id", controller.deleteWarehouseAccount);
router.put("/accounts/:id", controller.updateWarehouseAccount);
router.get("/sync-order-date", controller.syncOrderDate);

router.get("/system-products", controller.getSystemProducts);
router.get("/catalog", controller.getCatalogItems);
router.post("/catalog", controller.createCatalogItem);
router.put("/catalog/tags/rename", controller.renameCatalogTag);
router.delete("/catalog/tags", controller.deleteCatalogTag);
router.delete("/catalog/:id", controller.deleteCatalogItem);
router.put("/catalog/:id", controller.updateCatalogItem);
router.put("/catalog/:id/toggle-package", controller.toggleCatalogPackage);
router.post("/accounts/:id/open-browser", controller.openAccountBrowser);
router.post("/accounts/:id/services", controller.addServiceSlotToAccount);
router.put("/services/:id", controller.updateWarehouseServiceSlot);
router.delete("/services/:id", controller.deleteWarehouseServiceSlot);

router.get("/slot-daily-logs", controller.getSlotDailyLogs);
router.post("/slot-daily-logs/calculate", controller.calculateSlotDailyCosts);
router.post("/slot-daily-logs/backfill", controller.backfillSlotDailyCosts);

module.exports = router;
