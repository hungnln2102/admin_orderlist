/**
 * Task instances — khởi tạo sẵn các task functions để dùng chung
 * giữa API (SchedulerController trigger manual) và Scheduler (cron).
 * File này KHÔNG tạo side-effect (không schedule cron).
 */
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
  schedulerTimezone,
  cronExpression,
  runOnStart,
};
