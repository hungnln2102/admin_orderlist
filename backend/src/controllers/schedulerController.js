const { updateDatabaseTask, getSchedulerStatus } = require("../../scheduler");

const runSchedulerNow = async (_req, res) => {
  try {
    await updateDatabaseTask("manual");
    res.json({ success: true });
  } catch (error) {
    console.error("[scheduler] Cron job failed:", error);
    res.status(500).json({ error: "Unable to run scheduled task." });
  }
};

const schedulerStatus = (_req, res) => {
  const status = getSchedulerStatus();
  res.json({
    ...status,
    lastRunAt: status.lastRunAt ? status.lastRunAt.toISOString() : null,
  });
};

module.exports = {
  runSchedulerNow,
  schedulerStatus,
};
