const express = require("express");
const { listPromotionCodes } = require("../controllers/PromotionCodesController");

const router = express.Router();

router.get("/promotion-codes", listPromotionCodes);

module.exports = router;
