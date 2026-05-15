const express = require("express");
const { handleWebhookPost } = require("./postHandler");

const router = express.Router();

// Health check for webhook endpoint
router.get("/", (_req, res) => {
  res.json({ message: "Sepay webhook endpoint. Use POST with signature." });
});

router.post("/", handleWebhookPost);

module.exports = router;
