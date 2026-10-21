const express = require("express");
const { getTrafficStats } = require("../controllers/trafficController");

const router = express.Router();

router.get("/stats", getTrafficStats);

module.exports = router;
