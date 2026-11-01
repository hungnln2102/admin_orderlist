/**
 * routes.js (Realtime Domain)
 * Định tuyến cho kết nối SSE stream
 */
const express = require("express");
const router = express.Router();
const realtimeStreamService = require("./services/realtimeStreamService");

// GET /api/realtime/stream
router.get("/stream", (req, res) => {
  realtimeStreamService.handleConnection(req, res);
});

module.exports = router;

