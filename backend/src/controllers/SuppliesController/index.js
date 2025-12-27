const express = require("express");
const router = express.Router();

const { getSupplyInsights } = require("./handlers/insights");
const {
  listSupplies,
  getProductsBySupply,
  listPaymentsBySupply,
} = require("./handlers/list");
const { createPayment, updatePaymentImport } = require("./handlers/payments");
const {
  createSupply,
  updateSupply,
  toggleSupplyActive,
  deleteSupply,
} = require("./handlers/mutations");
const { getSupplyOverview } = require("./handlers/overview");

// Insights
router.get("/insights", getSupplyInsights);

// Basic list and related data
router.get("/", listSupplies);
router.get("/:supplyId/products", getProductsBySupply);
router.get("/:supplyId/payments", listPaymentsBySupply);
router.get("/:supplyId/overview", getSupplyOverview);

// Payments mutations
router.post("/:supplyId/payments", createPayment);
router.patch("/:supplyId/payments/:paymentId", updatePaymentImport);

// Supply mutations
router.post("/", createSupply);
router.patch("/:supplyId", updateSupply);
router.patch("/:supplyId/active", toggleSupplyActive);
router.delete("/:supplyId", deleteSupply);

module.exports = router;
module.exports.getSupplyInsights = getSupplyInsights;
