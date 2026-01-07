const express = require("express");
const { listBanks } = require("../controllers/BanksController");

const router = express.Router();

// Kept for API compatibility: always fetch external source, no DB cache needed.
router.get("/", listBanks);

module.exports = router;
