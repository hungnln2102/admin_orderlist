const express = require("express");
const { attachListRoutes } = require("./listRoutes");
const { attachRenewRoutes } = require("./renewRoutes");
const { attachCalculatePriceRoute } = require("./calculatePriceRoute");
const { attachCrudRoutes } = require("./crudRoutes");

const router = express.Router();

attachListRoutes(router);
attachRenewRoutes(router);
attachCalculatePriceRoute(router);
attachCrudRoutes(router);

module.exports = router;
