const express = require("express");
const { notifyError } = require("../utils/telegramErrorNotifier");
const { runFourDaysNotificationNow } = require("../controllers/SchedulerController");
const { requireCronInvokeSecret } = require("../middleware/secureCronInvoke");

const router = express.Router();
let lastFrontendReport = 0;

/** Cần `CRON_INVOKE_SECRET` (query ?secret=, header X-Cron-Invoke-Secret, hoặc Bearer) — dùng cho cron/DC. */
router.get("/run-due-notification", requireCronInvokeSecret, runFourDaysNotificationNow);

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
