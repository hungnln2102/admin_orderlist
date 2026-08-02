const express = require("express");
const {
  getSellerPricingTable,
  postCalculate,
  postVariantsPricing,
} = require("@/domains/public-pricing/controller");

const router = express.Router();

router.get("/seller-table", getSellerPricingTable);
router.post("/calculate", postCalculate);
router.post("/variants", postVariantsPricing);

module.exports = router;
