const express = require("express");
const { attachListRoutes } = require("./listRoutes");
const { attachRenewRoutes } = require("./renewRoutes");
const { attachCalculatePriceRoute } = require("./calculatePriceRoute");
const { attachCrudRoutes } = require("./crudRoutes");
const { attachRefundCreditRoutes } = require("./refundCreditRoutes");

const router = express.Router();

attachListRoutes(router);
attachRenewRoutes(router);
attachRefundCreditRoutes(router);
attachCalculatePriceRoute(router);
attachCrudRoutes(router);

module.exports = router;
