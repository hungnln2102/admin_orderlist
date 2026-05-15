const express = require("express");
const {
  dashboardStats,
  dashboardYears,
  dashboardCharts,
  dashboardMonthlySummary,
} = require("./controller");
const { dateRangeRules } = require("./validators/dashboardValidator");

const router = express.Router();

router.get("/stats", ...dateRangeRules, dashboardStats);
router.get("/years", dashboardYears);
router.get("/charts", ...dateRangeRules, dashboardCharts);
router.get("/monthly-summary", dashboardMonthlySummary);

module.exports = router;
