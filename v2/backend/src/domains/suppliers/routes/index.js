const express = require("express");
const router = express.Router();
const supplierController = require("../controllers/supplierController");

router.get("/overview", supplierController.getOverview);
router.get("/cost-logs", supplierController.getCostLogs);
router.get("/:id/details", supplierController.getSupplierDetail);
router.post("/:id/pay-debt", supplierController.payDebt);
router.patch("/:id/toggle-status", supplierController.toggleStatus);

router.post("/", supplierController.createSupplier);
router.put("/:id", supplierController.updateSupplier);
router.delete("/:id", supplierController.deleteSupplier);

module.exports = router;
