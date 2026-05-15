const express = require("express");
const { listCustomerStatus } = require("./controller");

const router = express.Router();
router.get("/customer-status", listCustomerStatus);

module.exports = router;
