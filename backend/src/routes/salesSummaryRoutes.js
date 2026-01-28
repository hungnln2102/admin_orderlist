// salesSummaryRoutes.js - Routes for sales summary API

const express = require("express");
const {
  getDailySalesSummary,
  getProductSalesSummary,
  getVariantSalesSummary,
  refreshSalesSummaryViews,
} = require("../controllers/SalesSummaryController");

const router = express.Router();

// GET /api/sales-summary/daily?days=30
router.get("/daily", getDailySalesSummary);

// GET /api/sales-summary/product?days=30
router.get("/product", getProductSalesSummary);

// GET /api/sales-summary/variant?days=30
router.get("/variant", getVariantSalesSummary);

// POST /api/sales-summary/refresh
router.post("/refresh", refreshSalesSummaryViews);

module.exports = router;
