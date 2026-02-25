const express = require("express");
const { notifyError } = require("../utils/telegramErrorNotifier");
const { runFourDaysNotificationNow } = require("../controllers/SchedulerController");

const router = express.Router();
let lastFrontendReport = 0;

router.get("/run-due-notification", runFourDaysNotificationNow);

router.post("/error-report", (req, res) => {
  const now = Date.now();
  if (now - lastFrontendReport < 1000) {
    return res.status(429).json({ ok: false });
  }
  lastFrontendReport = now;

  const { message, stack, url, extra } = req.body || {};
  if (!message) return res.status(400).json({ ok: false });

  notifyError({
    message: String(message).slice(0, 500),
    source: "frontend",
    url: String(url || "").slice(0, 200),
    stack: String(stack || "").slice(0, 500),
    extra: extra ? String(extra).slice(0, 200) : undefined,
  });

  res.json({ ok: true });
});

module.exports = router;
