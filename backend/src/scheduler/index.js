const cron = require("node-cron");
const logger = require("../utils/logger");
const config = require("./config");
const {
  createUpdateDatabaseTask,
  getLastRunAt,
} = require("./tasks/updateDatabaseTask");
const { createNotifyZeroDaysTask } = require("./tasks/notifyZeroDays");
const { createNotifyFourDaysTask } = require("./tasks/notifyFourDays");
const { createRenewAdobeCheckAndNotifyTask } = require("./tasks/renewAdobeCheckAndNotify");
const { createCleanupExpiredAdobeUsersTask } = require("./tasks/cleanupExpiredAdobeUsers");

const {
  pool,
  schedulerTimezone,
  cronExpression,
  runOnStart,
  enableDbBackup,
  getSqlCurrentDate,
} = config;

const updateDatabaseTask = createUpdateDatabaseTask(
  pool,
  getSqlCurrentDate,
  enableDbBackup
);
const notifyZeroDaysRemainingTask = createNotifyZeroDaysTask(
  pool,
  getSqlCurrentDate
);
const notifyFourDaysRemainingTask = createNotifyFourDaysTask(
  pool,
  getSqlCurrentDate
);
const renewAdobeCheckAndNotifyTask = createRenewAdobeCheckAndNotifyTask();
const cleanupExpiredAdobeUsersTask = createCleanupExpiredAdobeUsersTask();

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

if (require.main === module && process.argv.includes("--run-once")) {
  runCronSafe("manual");
}

cron.schedule(
  cronExpression,
  async () => {
    logger.info("[Scheduler] Cron 00:01 triggered", { cronExpression, timezone: schedulerTimezone });
    await runCronSafe("cron");
    logger.info("[Scheduler] Cron 00:01 — bắt đầu cleanup expired Adobe users");
    await runCleanupExpiredAdobeUsersSafe("cron");
  },
  { scheduled: true, timezone: schedulerTimezone }
);

if (runOnStart) {
  runCronSafe("startup");
}

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
  "0 5 * * *",
  () => {
    logger.info("[Scheduler] Cron 05:00 — check tài khoản Adobe & thông báo hết gói");
    runRenewAdobeCheckSafe("cron");
  },
  { scheduled: true, timezone: schedulerTimezone }
);

cron.schedule(
  "0 12 * * *",
  () => {
    logger.info("[Scheduler] Cron 12:00 — check tài khoản Adobe & thông báo hết gói");
    runRenewAdobeCheckSafe("cron");
  },
  { scheduled: true, timezone: schedulerTimezone }
);

logger.info(`[Scheduler] Đã khởi động`, {
  cronExpression,
  schedulerTimezone,
  runOnStart,
});

function getSchedulerStatus() {
  return {
    timezone: schedulerTimezone,
    cronExpression,
    runOnStart,
    lastRunAt: getLastRunAt(),
  };
}

module.exports = {
  updateDatabaseTask,
  notifyZeroDaysRemainingTask,
  notifyFourDaysRemainingTask,
  renewAdobeCheckAndNotifyTask,
  cleanupExpiredAdobeUsersTask,
  getSchedulerStatus,
};
