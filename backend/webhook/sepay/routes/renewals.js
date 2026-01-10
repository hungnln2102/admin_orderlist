const express = require("express");
const { isValidApiKey } = require("../auth");
const { runRenewalBatch } = require("../renewal");

const router = express.Router();

// Manual retry renewals (requires Sepay API key header)
router.post("/retry", async (req, res) => {
  if (!isValidApiKey(req)) {
    return res.status(403).json({ message: "Invalid API key" });
  }

  try {
    const { orders, force } = req.body || {};
    const summary = await runRenewalBatch({
      orderCodes: Array.isArray(orders) ? orders : undefined,
      forceRenewal: Boolean(force),
    });
    res.json({ message: "OK", ...summary });
  } catch (err) {
    console.error("Renewal retry failed:", err);
    res.status(500).json({ message: "Internal Error" });
  }
});

module.exports = router;
