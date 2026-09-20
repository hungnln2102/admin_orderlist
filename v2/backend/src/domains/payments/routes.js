const express = require("express");
const router = express.Router();
const { handlePaymentWebhook } = require("./controllers/webhookController");

// Endpoint tiếp nhận webhook từ SePay hoặc các Cổng thanh toán ngân hàng
router.post("/sepay", handlePaymentWebhook);
router.post("/payment", handlePaymentWebhook);

module.exports = router;
