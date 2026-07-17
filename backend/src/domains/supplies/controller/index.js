const express = require("express");
const router = express.Router();

const { getSupplyInsights } = require("@/domains/supplies/controller/handlers/insights");
const {
  listSupplies,
  getProductsBySupply,
  listPaymentsBySupply,
  listSupplyOrderCosts,
} = require("@/domains/supplies/controller/handlers/list");
const { createPayment, updatePaymentImport } = require("@/domains/supplies/controller/handlers/payments");
const {
  createSupply,
  updateSupply,
  toggleSupplyActive,
  deleteSupply,
} = require("@/domains/supplies/controller/handlers/mutations");
const { getSupplyOverview } = require("@/domains/supplies/controller/handlers/overview");
const {
  supplyIdParam,
  createSupplyRules,
  createPaymentRules,
  updatePaymentRules,
} = require("@/domains/supplies/validators/supplyValidator");

router.get("/insights", getSupplyInsights);

router.get("/", listSupplies);
router.get("/order-costs", listSupplyOrderCosts);
router.get("/:supplyId/products", ...supplyIdParam, getProductsBySupply);
router.get("/:supplyId/payments", ...supplyIdParam, listPaymentsBySupply);
router.get("/:supplyId/overview", ...supplyIdParam, getSupplyOverview);

router.post("/:supplyId/payments", ...createPaymentRules, createPayment);
router.patch("/:supplyId/payments/:paymentId", ...updatePaymentRules, updatePaymentImport);

router.post("/", ...createSupplyRules, createSupply);
router.patch("/:supplyId", ...supplyIdParam, updateSupply);
router.patch("/:supplyId/active", ...supplyIdParam, toggleSupplyActive);
router.delete("/:supplyId", ...supplyIdParam, deleteSupply);

module.exports = router;
module.exports.getSupplyInsights = getSupplyInsights;
