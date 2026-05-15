const express = require("express");
const { listBanks } = require("./controller");

const router = express.Router();

// Kept for API compatibility: always fetch external source, no DB cache needed.
router.get("/", listBanks);

module.exports = router;
