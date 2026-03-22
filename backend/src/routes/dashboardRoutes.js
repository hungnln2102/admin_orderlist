const express = require("express");
const {
  dashboardStats,
  dashboardYears,
  dashboardCharts,
  dashboardMonthlySummary,
} = require("../controllers/DashboardController");

const router = express.Router();

router.get("/stats", dashboardStats);
router.get("/years", dashboardYears);
router.get("/charts", dashboardCharts);
router.get("/monthly-summary", dashboardMonthlySummary);

module.exports = router;
