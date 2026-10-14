/**
 * financeHubRoutes.js
 */

const express = require("express");
const router = express.Router();
const financeHubController = require("../controllers/financeHubController");

// Tổng quan hòa vốn, KPI, dòng tiền tháng
router.get("/summary", financeHubController.getSummary);

// Chi phí cố định (Fixed costs)
router.post("/fixed-costs", financeHubController.createFixedCost);
router.put("/fixed-costs/:id", financeHubController.updateFixedCost);
router.delete("/fixed-costs/:id", financeHubController.deleteFixedCost);

// Trả góp theo kỳ (Installments)
router.post("/installments", financeHubController.createInstallment);
router.put("/installments/:id", financeHubController.updateInstallment);
router.delete("/installments/:id", financeHubController.deleteInstallment);

// Tài sản & Nợ cá nhân (Personal assets)
router.post("/personal-assets", financeHubController.createPersonalAsset);
router.put("/personal-assets/:id", financeHubController.updatePersonalAsset);
router.delete("/personal-assets/:id", financeHubController.deletePersonalAsset);

module.exports = router;
