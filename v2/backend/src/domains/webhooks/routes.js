const express = require("express");
const router = express.Router();
const { handleSePayWebhook } = require("./controllers/webhookController");

// Endpoint tiếp nhận webhook từ SePay (POST /api/webhooks/sepay)
router.post("/sepay", handleSePayWebhook);

// Catch-all webhook endpoint (POST /api/webhooks)
router.post("/", handleSePayWebhook);

module.exports = router;
