const {
  updateDatabaseTask,
  getSchedulerStatus,
  notifyFourDaysRemainingTask,
  cleanupExpiredAdobeUsersTask,
  renewAdobeCheckAndNotifyTask,
  cleanupAdobeProfileGarbageTask,
  syncDailyRevenueSummaryTask,
} = require("../../scheduler/taskInstances");
const logger = require("../../utils/logger");
const { syncOrdersToMapping } = require("../../services/userAccountMappingService");

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

const runSyncMappingNow = async (_req, res) => {
  try {
    const result = await syncOrdersToMapping();
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error("[scheduler] Sync mapping failed", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể chạy sync mapping." });
  }
};

const runCleanupAdobeProfileGarbageNow = async (_req, res) => {
  try {
    const result = await cleanupAdobeProfileGarbageTask("manual");
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error("[scheduler] Cleanup Adobe profile garbage failed", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ error: "Không thể chạy cleanup profile rác Adobe." });
  }
};

const runDailyRevenueSummaryNow = async (_req, res) => {
  try {
    await syncDailyRevenueSummaryTask("manual");
    res.json({ success: true });
  } catch (error) {
    logger.error("[scheduler] daily_revenue_summary sync failed", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ error: "Không thể đồng bộ daily_revenue_summary." });
  }
};

module.exports = {
  runSchedulerNow,
  schedulerStatus,
  runFourDaysNotificationNow,
  runCleanupExpiredAdobeUsersNow,
  runCleanupAdobeProfileGarbageNow,
  runRenewAdobeCheckNow,
  runSyncMappingNow,
  runDailyRevenueSummaryNow,
};
