const cron = require("node-cron");
const { updateOrderStatusTask } = require("./tasks/updateOrderStatusTask");
const { notifyZeroDaysTask } = require("./tasks/notifyZeroDaysTask");
const { notifyFourDaysTask } = require("./tasks/notifyFourDaysTask");
const { finalizeDailySummaryTask } = require("./tasks/finalizeDailySummaryTask");
const { creditSavingsProfitTask } = require("./tasks/creditSavingsProfitTask");
const { autoBackupDatabaseTask } = require("./tasks/autoBackupDatabaseTask");
const cronJobService = require("@/domains/system/services/cronJobService");

const TIMEZONE = "Asia/Ho_Chi_Minh";
const scheduledTasks = new Map();
let initialized = false;
const handlers = {
  order_status_0h: async () => ({ update: await updateOrderStatusTask("cron_schedule"), zeroDays: await notifyZeroDaysTask("cron_schedule") }),
  notify_four_days: () => notifyFourDaysTask("cron_schedule"),
  credit_savings_profit: () => creditSavingsProfitTask("cron_schedule"),
  finalize_daily_summary: () => finalizeDailySummaryTask("cron_schedule"),
  auto_backup_database: () => autoBackupDatabaseTask("cron_schedule"),
};

const serializeResult = (result) => JSON.stringify(result ?? { success: true });

async function executeJob(job, triggeredBy = "cron_schedule") {
  const handler = handlers[job.handler_key];
  if (!handler) throw new Error("Tác vụ chưa được gắn handler chạy nền.");
  const startedAt = new Date();
  try {
    const result = await handler();
    await cronJobService.recordExecution(job.id, { startedAt, durationMs: Date.now() - startedAt.getTime(), status: "success", output: serializeResult(result), triggeredBy });
    return result;
  } catch (error) {
    await cronJobService.recordExecution(job.id, { startedAt, durationMs: Date.now() - startedAt.getTime(), status: "failed", output: error.message || "Không thể chạy tác vụ.", triggeredBy });
    throw error;
  }
}

function stopJob(id) {
  const task = scheduledTasks.get(id);
  if (task) task.stop();
  scheduledTasks.delete(id);
}

function scheduleJob(job) {
  stopJob(job.id);
  if (!job.enabled || !job.handler_key) return;
  const expression = cronJobService.buildCronExpression({ time: job.time, frequency: job.frequency, selectedDays: Array.isArray(job.selected_days) ? job.selected_days : JSON.parse(job.selected_days || "[]") });
  if (!cron.validate(expression)) throw new Error(`Biểu thức cron không hợp lệ: ${expression}`);
  const task = cron.schedule(expression, () => executeJob(job).catch((error) => console.error(`[Scheduler] ${job.id} failed:`, error.message)), { timezone: TIMEZONE });
  scheduledTasks.set(job.id, task);
}

async function refreshJob(id) {
  const job = await cronJobService.getJob(id);
  scheduleJob(job);
  return job;
}

async function initScheduler() {
  if (initialized) return;
  const jobs = await cronJobService.listJobs();
  const rawJobs = await Promise.all(jobs.map((job) => cronJobService.getJob(job.id)));
  rawJobs.forEach(scheduleJob);
  initialized = true;
  console.log(`[Scheduler] Đã khởi tạo ${scheduledTasks.size} lịch tác vụ.`);
}

function getNextRunTime(id) {
  const nextRun = scheduledTasks.get(id)?.getNextRun?.();
  return nextRun ? nextRun.toISOString() : null;
}

async function runJobNow(id) {
  const job = await cronJobService.getJob(id);
  return executeJob(job, "manual_ui");
}

module.exports = { getNextRunTime, initScheduler, refreshJob, runJobNow };
