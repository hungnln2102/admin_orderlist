const express = require("express");
const { getTrafficStats } = require("../controllers/trafficController");

const { getTrafficIps, getTrafficIpMap } = require("../services/trafficIpService");

const router = express.Router();

router.get("/stats", getTrafficStats);

router.get("/ip-map", async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  const days = Math.min(30, Math.max(1, parseInt(req.query.days, 10) || 30));
  try {
    const data = await getTrafficIpMap({ days });
    return res.json({ success: true, data });
  } catch (error) {
    console.error("[TRAFFIC] IP map log unavailable:", error.code || error.name);
    return res.status(503).json({ success: false, reason: "log_unavailable" });
  }
});

router.post("/ips", async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  const filters = req.body ?? {};
  const days = Math.min(30, Math.max(1, parseInt(filters.days, 10) || 30));
  const search = typeof filters.search === "string" ? filters.search.trim().toLowerCase() : "";
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  if (search.length > 45 || !/^[a-f0-9:.]*$/.test(search)) {
    return res.status(400).json({ success: false, reason: "invalid_ip_search" });
  }
  try {
    const data = await getTrafficIps({ days, search, page });
    return res.json({ success: true, data });
  } catch (error) {
    console.error("[TRAFFIC] Access log unavailable:", error.code || error.name);
    return res.status(503).json({ success: false, reason: "log_unavailable" });
  }
});

module.exports = router;
