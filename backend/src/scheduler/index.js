const cron = require("node-cron");
const logger = require("../utils/logger");
const config = require("./config");
const {
  createUpdateDatabaseTask,
  getLastRunAt,
} = require("./tasks/updateDatabaseTask");
const { createNotifyZeroDaysTask } = require("./tasks/notifyZeroDays");
const { createNotifyFourDaysTask } = require("./tasks/notifyFourDays");

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

if (require.main === module && process.argv.includes("--run-once")) {
  runCronSafe("manual");
}

cron.schedule(
  cronExpression,
  () => runCronSafe("cron"),
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
  getSchedulerStatus,
};
