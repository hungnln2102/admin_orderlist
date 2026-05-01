const express = require("express");
const { listCustomerStatus } = require("../../controllers/CustomerStatusController");

const router = express.Router();
router.get("/customer-status", listCustomerStatus);

module.exports = router;
