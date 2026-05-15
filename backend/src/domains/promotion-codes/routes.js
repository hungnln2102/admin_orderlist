const express = require("express");
const { listPromotionCodes } = require("./controller");

const router = express.Router();

router.get("/promotion-codes", listPromotionCodes);

module.exports = router;
