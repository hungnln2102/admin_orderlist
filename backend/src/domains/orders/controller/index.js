const express = require("express");
const { attachListRoutes } = require("./listRoutes");
const { attachRenewRoutes } = require("./renewRoutes");
const { attachCalculatePriceRoute } = require("./calculatePriceRoute");
const { attachCrudRoutes } = require("./crudRoutes");
const { attachRefundCreditRoutes } = require("./refundCreditRoutes");
const { attachManualWebhookCompletionRoute } = require("./manualWebhookCompletion");
const { attachManualUsdtCompletionRoute } = require("./manualUsdtCompletion");

const router = express.Router();

attachListRoutes(router);
attachRenewRoutes(router);
attachRefundCreditRoutes(router);
attachManualWebhookCompletionRoute(router);
attachManualUsdtCompletionRoute(router);
attachCalculatePriceRoute(router);
attachCrudRoutes(router);

module.exports = router;
