const express = require("express");
const router = express.Router();
const { handleSePayWebhook } = require("./controllers/webhookController");
const { requireSepayApiKey } = require("./services/sepayAuth");

// Endpoint tiếp nhận webhook từ SePay (POST /api/webhooks/sepay)
router.post("/sepay", requireSepayApiKey, handleSePayWebhook);

// Catch-all webhook endpoint (POST /api/webhooks)
router.post("/", requireSepayApiKey, handleSePayWebhook);

module.exports = router;
