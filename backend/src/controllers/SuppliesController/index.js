const express = require("express");
const router = express.Router();

const { getSupplyInsights } = require("./handlers/insights");
const {
  listSupplies,
  getProductsBySupply,
  listPaymentsBySupply,
  listSupplyOrderCosts,
} = require("./handlers/list");
const { createPayment, updatePaymentImport } = require("./handlers/payments");
const {
  createSupply,
  updateSupply,
  toggleSupplyActive,
  deleteSupply,
} = require("./handlers/mutations");
const { getSupplyOverview } = require("./handlers/overview");
const {
  supplyIdParam,
  createSupplyRules,
  createPaymentRules,
  updatePaymentRules,
} = require("../../validators/supplyValidator");

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
