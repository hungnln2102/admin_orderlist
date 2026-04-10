const express = require("express");
const {
  listTiers,
  createTier,
  updateTier,
  getVariantMargins,
  upsertVariantMargins,
} = require("../controllers/PricingTierController");
const {
  tierIdParam,
  createTierRules,
  variantIdParam,
  upsertMarginsRules,
} = require("../validators/pricingTierValidator");

const router = express.Router();

router.get("/", listTiers);
router.post("/", ...createTierRules, createTier);
router.put("/:id", ...tierIdParam, updateTier);
router.get("/variant/:id/margins", ...variantIdParam, getVariantMargins);
router.put("/variant/:id/margins", ...upsertMarginsRules, upsertVariantMargins);

module.exports = router;
