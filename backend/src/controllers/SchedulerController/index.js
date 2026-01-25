const { updateDatabaseTask, getSchedulerStatus } = require("../../../scheduler");
const logger = require("../../utils/logger");

const runSchedulerNow = async (_req, res) => {
  try {
    await updateDatabaseTask("manual");
    res.json({ success: true });
  } catch (error) {
    logger.error("[scheduler] Cron job failed", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể chạy tác vụ theo lịch trình." });
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
