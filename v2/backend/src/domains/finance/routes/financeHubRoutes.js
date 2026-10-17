/**
 * financeHubRoutes.js
 */

const express = require("express");
const router = express.Router();
const financeHubController = require("../controllers/financeHubController");

// Tổng quan hòa vốn, KPI, dòng tiền tháng
router.get("/summary", financeHubController.getSummary);
router.get("/unallocated-receipts", financeHubController.getUnallocatedReceipts);

// Chi phí cố định (Fixed costs)
router.post("/fixed-costs", financeHubController.createFixedCost);
router.put("/fixed-costs/:id", financeHubController.updateFixedCost);
router.delete("/fixed-costs/:id", financeHubController.deleteFixedCost);

// Trả góp theo kỳ (Installments)
router.post("/installments", financeHubController.createInstallment);
router.put("/installments/:id", financeHubController.updateInstallment);
router.delete("/installments/:id", financeHubController.deleteInstallment);
router.post("/installments/:id/pay", financeHubController.payInstallment);

// Tài sản & Nợ cá nhân (Personal assets)
router.post("/personal-assets", financeHubController.createPersonalAsset);
router.put("/personal-assets/:id", financeHubController.updatePersonalAsset);
router.delete("/personal-assets/:id", financeHubController.deletePersonalAsset);
router.post("/personal-assets/:id/pay", financeHubController.payPersonalAsset);
router.post("/personal-assets/:id/borrow", financeHubController.borrowPersonalAsset);

module.exports = router;
