const express = require("express");
const {
  dashboardStats,
  dashboardYears,
  dashboardCharts,
} = require("../controllers/DashboardController");

const router = express.Router();

router.get("/stats", dashboardStats);
router.get("/years", dashboardYears);
router.get("/charts", dashboardCharts);

module.exports = router;
