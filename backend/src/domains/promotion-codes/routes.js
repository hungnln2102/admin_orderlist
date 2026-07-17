const express = require("express");
const { listPromotionCodes } = require("@/domains/promotion-codes/controller");

const router = express.Router();

router.get("/promotion-codes", listPromotionCodes);

module.exports = router;
