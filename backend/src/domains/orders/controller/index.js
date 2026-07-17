const express = require("express");
const { attachListRoutes } = require("@/domains/orders/controller/listRoutes");
const { attachRenewRoutes } = require("@/domains/orders/controller/renewRoutes");
const { attachCalculatePriceRoute } = require("@/domains/orders/controller/calculatePriceRoute");
const { attachCrudRoutes } = require("@/domains/orders/controller/crudRoutes");
const { attachRefundCreditRoutes } = require("@/domains/orders/controller/refundCreditRoutes");
const { attachManualWebhookCompletionRoute } = require("@/domains/orders/controller/manualWebhookCompletionRoute");
const { attachManualUsdtCompletionRoute } = require("@/domains/orders/controller/manualUsdtCompletionRoute");
const { attachMockWebhookRoute } = require("@/domains/orders/controller/mockWebhookRoute");

const router = express.Router();

attachListRoutes(router);
attachRenewRoutes(router);
attachRefundCreditRoutes(router);
attachManualWebhookCompletionRoute(router);
attachManualUsdtCompletionRoute(router);
attachMockWebhookRoute(router);
attachCalculatePriceRoute(router);
attachCrudRoutes(router);

module.exports = router;
