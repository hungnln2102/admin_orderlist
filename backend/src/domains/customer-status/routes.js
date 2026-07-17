const express = require("express");
const { listCustomerStatus } = require("@/domains/customer-status/controller");

const router = express.Router();
router.get("/customer-status", listCustomerStatus);

module.exports = router;
