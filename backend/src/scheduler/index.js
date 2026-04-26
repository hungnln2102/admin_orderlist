/**
 * Scheduler entry — đăng ký cron jobs.
 * File này có side-effect: khi require() sẽ tự động schedule cron.
 * Chỉ nên import bởi scheduler process (scheduler.js / scheduler-server.js).
 * API server dùng SchedulerController → import taskInstances.js trực tiếp.
 */
const cron = require("node-cron");
const logger = require("../utils/logger");

const {
  updateDatabaseTask,
  notifyZeroDaysRemainingTask,
  notifyFourDaysRemainingTask,
  renewAdobeCheckAndNotifyTask,
  cleanupExpiredAdobeUsersTask,
  cleanupAdobeProfileGarbageTask,
  getSchedulerStatus,
  schedulerTimezone,
  cronExpression,
  runOnStart,
} = require("./taskInstances");

const runCronSafe = (source) =>
  updateDatabaseTask(source).catch((err) =>
    logger.error(`[CRON] Failed during ${source}`, {
      error: err.message,
      stack: err.stack,
    })
  );

const runZeroDaysNotificationSafe = (source) =>
  notifyZeroDaysRemainingTask(source).catch((err) =>
    logger.error(`[CRON] Zero days notification failed during ${source}`, {
      error: err.message,
      stack: err.stack,
    })
  );

const runFourDaysNotificationSafe = (source) =>
  notifyFourDaysRemainingTask(source).catch((err) =>
    logger.error(`[CRON] Four days notification failed during ${source}`, {
      error: err.message,
      stack: err.stack,
    })
  );

const runRenewAdobeCheckSafe = (source) =>
  renewAdobeCheckAndNotifyTask(source).catch((err) =>
    logger.error(`[CRON] Renew Adobe check & notify failed during ${source}`, {
      error: err.message,
      stack: err.stack,
    })
  );

const runCleanupExpiredAdobeUsersSafe = (source) =>
  cleanupExpiredAdobeUsersTask(source).catch((err) =>
    logger.error(`[CRON] Cleanup expired Adobe users failed during ${source}`, {
      error: err.message,
      stack: err.stack,
    })
  );

const runCleanupAdobeProfileGarbageSafe = (source) =>
  cleanupAdobeProfileGarbageTask(source).catch((err) =>
    logger.error(`[CRON] Cleanup Adobe profile garbage failed during ${source}`, {
      error: err.message,
      stack: err.stack,
    })
  );

if (require.main === module && process.argv.includes("--run-once")) {
  runCronSafe("manual");
}

cron.schedule(
  cronExpression,
  async () => {
    logger.info("[Scheduler] Cron 00:01 triggered", { cronExpression, timezone: schedulerTimezone });
    await runCronSafe("cron");
  },
  { scheduled: true, timezone: schedulerTimezone }
);

if (runOnStart) {
  runCronSafe("startup");
}

cron.schedule(
  "0 0 * * *",
  async () => {
    logger.info("[Scheduler] Cron 00:00 — cleanup orphan Adobe profile dirs");
    await runCleanupAdobeProfileGarbageSafe("cron");
  },
  { scheduled: true, timezone: schedulerTimezone }
);

cron.schedule(
  "30 23 * * *",
  async () => {
    logger.info(
      "[Scheduler] Cron 23:30 — cleanup user Adobe: tracking/order hết hạn + mapping → theo từng admin (tùy env check-all trước)"
    );
    await runCleanupExpiredAdobeUsersSafe("cron");
  },
  { scheduled: true, timezone: schedulerTimezone }
);

cron.schedule(
  "0 18 * * *",
  () => runZeroDaysNotificationSafe("cron"),
  { scheduled: true, timezone: schedulerTimezone }
);

cron.schedule(
  "0 7 * * *",
  () => runFourDaysNotificationSafe("cron"),
  { scheduled: true, timezone: schedulerTimezone }
);

cron.schedule(
  "0 * * * *",
  () => {
    logger.info(
      "[Scheduler] Cron hàng giờ — check tài khoản Adobe & thông báo hết gói"
    );
    runRenewAdobeCheckSafe("cron");
  },
  { scheduled: true, timezone: schedulerTimezone }
);

logger.info(`[Scheduler] Đã khởi động`, {
  cronExpression,
  /** Job update DB / backup — không phải Renew Adobe. */
  cronExpressionNote: "CRON_SCHEDULE (vd. 1 0 * * * = 00:01 mỗi ngày)",
  renewAdobeCron: "0 * * * *",
  renewAdobeNote: "Mỗi giờ phút 0 (timezone scheduler) — check tài khoản Adobe",
  schedulerTimezone,
  runOnStart,
});

module.exports = {
  updateDatabaseTask,
  notifyZeroDaysRemainingTask,
  notifyFourDaysRemainingTask,
  renewAdobeCheckAndNotifyTask,
  cleanupExpiredAdobeUsersTask,
  cleanupAdobeProfileGarbageTask,
  getSchedulerStatus,
};
