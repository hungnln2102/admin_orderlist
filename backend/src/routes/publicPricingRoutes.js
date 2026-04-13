const express = require("express");
const { postCalculate } = require("../controllers/PublicPricingController");
const { postVariantsPricing } = require("../controllers/PublicCatalogPricingController");

const router = express.Router();

router.post("/calculate", postCalculate);
router.post("/variants", postVariantsPricing);

module.exports = router;
