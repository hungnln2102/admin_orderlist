const { updateDatabaseTask, getSchedulerStatus, notifyFourDaysRemainingTask, cleanupExpiredAdobeUsersTask, renewAdobeCheckAndNotifyTask } = require("../../../scheduler");
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

const runFourDaysNotificationNow = async (_req, res) => {
  try {
    await notifyFourDaysRemainingTask("manual");
    res.json({ success: true });
  } catch (error) {
    logger.error("[scheduler] Four days notification failed", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể gửi thông báo đơn đến hạn." });
  }
};

const schedulerStatus = (_req, res) => {
  const status = getSchedulerStatus();
  res.json({
    ...status,
    lastRunAt: status.lastRunAt ? status.lastRunAt.toISOString() : null,
  });
};

const runCleanupExpiredAdobeUsersNow = async (_req, res) => {
  try {
    await cleanupExpiredAdobeUsersTask("manual");
    res.json({ success: true });
  } catch (error) {
    logger.error("[scheduler] Cleanup expired Adobe users failed", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể chạy cleanup expired Adobe users." });
  }
};

const runRenewAdobeCheckNow = async (_req, res) => {
  try {
    await renewAdobeCheckAndNotifyTask("manual");
    res.json({ success: true });
  } catch (error) {
    logger.error("[scheduler] Renew Adobe check & notify failed", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể chạy job check tài khoản Adobe." });
  }
};

module.exports = {
  runSchedulerNow,
  schedulerStatus,
  runFourDaysNotificationNow,
  runCleanupExpiredAdobeUsersNow,
  runRenewAdobeCheckNow,
};
