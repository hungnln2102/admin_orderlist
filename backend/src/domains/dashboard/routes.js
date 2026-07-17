const express = require("express");
const {
  dashboardStats,
  dashboardYears,
  dashboardCharts,
  dashboardMonthlySummary,
} = require("@/domains/dashboard/controller");
const { dateRangeRules } = require("@/domains/dashboard/validators/dashboardValidator");

const router = express.Router();

router.get("/stats", ...dateRangeRules, dashboardStats);
router.get("/years", dashboardYears);
router.get("/charts", ...dateRangeRules, dashboardCharts);
router.get("/monthly-summary", dashboardMonthlySummary);

module.exports = router;
