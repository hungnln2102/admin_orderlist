/**
 * Task instances — khởi tạo sẵn các task functions để dùng chung
 * giữa API (SchedulerController trigger manual) và Scheduler (cron).
 * File này KHÔNG tạo side-effect (không schedule cron).
 */
const config = require("@/scheduler/config");
const {
  createUpdateDatabaseTask,
  getLastRunAt,
} = require("@/scheduler/tasks/updateDatabaseTask");
const { createNotifyZeroDaysTask } = require("@/scheduler/tasks/notifyZeroDays");
const { createNotifyFourDaysTask } = require("@/scheduler/tasks/notifyFourDays");
const { createRenewAdobeCheckAndNotifyTask } = require("@/scheduler/tasks/renewAdobeCheckAndNotify");
const { createCleanupExpiredAdobeUsersTask } = require("@/scheduler/tasks/cleanupExpiredAdobeUsers");
const {
  createCleanupAdobeProfileGarbageTask,
} = require("@/scheduler/tasks/cleanupAdobeProfileGarbage");
const {
  createCleanupExpiredTrackingTask,
} = require("@/scheduler/tasks/cleanupExpiredTracking");
const {
  syncDailyRevenueSummaryTask,
} = require("@/scheduler/tasks/syncDailyRevenueSummaryTask");

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
const cleanupAdobeProfileGarbageTask = createCleanupAdobeProfileGarbageTask();
const cleanupExpiredTrackingTask = createCleanupExpiredTrackingTask();

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
  cleanupAdobeProfileGarbageTask,
  cleanupExpiredTrackingTask,
  syncDailyRevenueSummaryTask,
  getSchedulerStatus,
  schedulerTimezone,
  cronExpression,
  runOnStart,
};
