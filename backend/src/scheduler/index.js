const cron = require("node-cron");
const { updateOrderStatusTask } = require("./tasks/updateOrderStatusTask");
const { notifyZeroDaysTask } = require("./tasks/notifyZeroDaysTask");
const { notifyFourDaysTask } = require("./tasks/notifyFourDaysTask");
const { finalizeDailySummaryTask } = require("./tasks/finalizeDailySummaryTask");
const { creditSavingsProfitTask } = require("./tasks/creditSavingsProfitTask");
const { autoBackupDatabaseTask } = require("./tasks/autoBackupDatabaseTask");
const { accrueCreditOverdraftInterestTask, closeCreditOverdraftStatementsTask, evaluateCreditCardDueStatementsTask } = require("./tasks/creditLedgerTask");
const cronJobService = require("@/domains/system/services/cronJobService");
const { db, TABLES } = require("@/db");

const TIMEZONE = "Asia/Ho_Chi_Minh";
const scheduledTasks = new Map();
let initialized = false;
let watchdogInterval = null;

const handlers = {
  order_status_0h: () => updateOrderStatusTask("cron_schedule"),
  notify_zero_days: () => notifyZeroDaysTask("cron_schedule"),
  notify_four_days: () => notifyFourDaysTask("cron_schedule"),
  credit_savings_profit: () => creditSavingsProfitTask("cron_schedule"),
  finalize_daily_summary: () => finalizeDailySummaryTask("cron_schedule"),
  auto_backup_database: () => autoBackupDatabaseTask("cron_schedule"),
  credit_overdraft_accrual: () => accrueCreditOverdraftInterestTask("cron_schedule"),
  credit_overdraft_statement_close: () => closeCreditOverdraftStatementsTask("cron_schedule"),
  credit_card_due_evaluation: () => evaluateCreditCardDueStatementsTask("cron_schedule"),
};

const serializeResult = (result) => JSON.stringify(result ?? { success: true });

async function executeJob(job, triggeredBy = "cron_schedule") {
  const handler = handlers[job.handler_key];
  if (!handler) throw new Error("Tác vụ chưa được gắn handler chạy nền.");
  const startedAt = new Date();
  try {
    const result = await handler();
    await cronJobService.recordExecution(job.id, {
      startedAt,
      durationMs: Date.now() - startedAt.getTime(),
      status: "success",
      output: serializeResult(result),
      triggeredBy,
    });
    return result;
  } catch (error) {
    await cronJobService.recordExecution(job.id, {
      startedAt,
      durationMs: Date.now() - startedAt.getTime(),
      status: "failed",
      output: error.message || "Không thể chạy tác vụ.",
      triggeredBy,
    });
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

  const expression = cronJobService.buildCronExpression({
    time: job.time,
    frequency: job.frequency,
    selectedDays: Array.isArray(job.selected_days) ? job.selected_days : JSON.parse(job.selected_days || "[]"),
  });

  if (!cron.validate(expression)) throw new Error(`Biểu thức cron không hợp lệ: ${expression}`);

  // Nâng dung sai trễ lên 5 phút (300.000ms) để chống drop tác vụ khi máy chủ bận
  const task = cron.schedule(
    expression,
    () => executeJob(job).catch((error) => console.error(`[Scheduler] ${job.id} failed:`, error.message)),
    {
      timezone: TIMEZONE,
      name: job.id,
      missedExecutionTolerance: 300000,
    }
  );

  // Lắng nghe sự kiện execution:missed của node-cron v4.6.0
  task.on("execution:missed", async (context) => {
    const missedDate = context?.date || new Date();
    console.warn(`[Scheduler] ⚠️ Tác vụ ${job.id} bị lỡ nhịp lúc ${new Date(missedDate).toISOString()}! Tự động ghi log và kích hoạt chạy bù...`);
    try {
      await cronJobService.recordExecution(job.id, {
        startedAt: new Date(missedDate),
        durationMs: 0,
        status: "failed",
        output: `[MISSED_EXECUTION] Tác vụ bị trễ nhịp lúc ${new Date(missedDate).toISOString()}. Đã kích hoạt phục hồi chạy bù.`,
        triggeredBy: "cron_schedule",
      });
      // Tự động chạy bù an toàn
      executeJob(job, "cron_schedule").catch((err) => console.error(`[Scheduler] Lỗi chạy bù cho ${job.id}:`, err.message));
    } catch (recErr) {
      console.error(`[Scheduler] Lỗi ghi nhận missed execution cho ${job.id}:`, recErr.message);
    }
  });

  // Lắng nghe sự kiện execution:overlap
  task.on("execution:overlap", () => {
    console.warn(`[Scheduler] ⚠️ Tác vụ ${job.id} bị chồng lấn (lượt chạy trước chưa hoàn thành)!`);
  });

  scheduledTasks.set(job.id, task);
}

async function refreshJob(id) {
  const job = await cronJobService.getJob(id);
  scheduleJob(job);
  return job;
}

/**
 * Watchdog Heartbeat: Chạy định kỳ mỗi 60 giây để bảo vệ các tác vụ hàng ngày.
 * Nếu đến đúng giờ Master cài đặt trên Trang Hệ Thống mà node-cron bị trượt nhịp (timer drift),
 * Watchdog sẽ tự động kích hoạt tác vụ chạy an toàn (idempotent qua cron_job_logs + withAdvisoryLock).
 */
async function checkAndRunMissedJobs() {
  try {
    const nowVn = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const currentHour = nowVn.getUTCHours();
    const currentMinute = nowVn.getUTCMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const dayOfWeek = nowVn.getUTCDay(); // 0: CN, 1: T2, ..., 6: T7

    // Mốc bắt đầu ngày hôm nay (00:00:00 VN = 17:00:00 UTC hôm trước)
    const todayStartVn = new Date(Date.UTC(nowVn.getUTCFullYear(), nowVn.getUTCMonth(), nowVn.getUTCDate(), 0, 0, 0, 0));
    const todayStartUtc = new Date(todayStartVn.getTime() - 7 * 60 * 60 * 1000);

    const jobs = await db(TABLES.CRON_JOBS).where("enabled", true).whereNotNull("handler_key");

    for (const job of jobs) {
      if (job.frequency !== "daily" && job.frequency !== "weekdays") continue;
      if (job.frequency === "weekdays" && (dayOfWeek === 0 || dayOfWeek === 6)) continue;

      if (!job.time || !job.time.includes(":")) continue;
      const [jobHour, jobMinute] = job.time.split(":").map(Number);
      const jobTotalMinutes = jobHour * 60 + jobMinute;
      const diffMinutes = currentTotalMinutes - jobTotalMinutes;

      // Cửa sổ kích hoạt: đúng phút (0) hoặc trong vòng 3 phút trễ sau mốc giờ đã cài
      if (diffMinutes >= 0 && diffMinutes <= 3) {
        const recentSuccess = await db(TABLES.CRON_JOB_LOGS)
          .where("job_id", job.id)
          .where("status", "success")
          .where("started_at", ">=", todayStartUtc)
          .first();

        if (!recentSuccess) {
          console.log(`[Watchdog] 🛡️ Kích hoạt bảo vệ cho tác vụ [${job.id}] (${job.name}) tại mốc ${job.time} (Độ lệch: ${diffMinutes}m)...`);
          executeJob(job, "cron_schedule").catch((err) => {
            console.error(`[Watchdog] Lỗi kích hoạt tác vụ ${job.id}:`, err.message);
          });
        }
      }
    }
  } catch (error) {
    console.error("[Watchdog] Lỗi kiểm tra nhịp chạy định kỳ:", error.message);
  }
}

function startWatchdog() {
  if (watchdogInterval) return;
  watchdogInterval = setInterval(checkAndRunMissedJobs, 60000);
  if (typeof watchdogInterval.unref === "function") {
    watchdogInterval.unref();
  }
  console.log("[Scheduler] 🛡️ Watchdog Heartbeat (60s) đã được khởi động.");
}

function stopWatchdog() {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
  }
}

async function initScheduler() {
  if (initialized) return;
  const jobs = await cronJobService.listJobs();
  const rawJobs = await Promise.all(jobs.map((job) => cronJobService.getJob(job.id)));
  rawJobs.forEach(scheduleJob);
  initialized = true;
  console.log(`[Scheduler] Đã khởi tạo ${scheduledTasks.size} lịch tác vụ.`);
  startWatchdog();
}

function getNextRunTime(id) {
  const nextRun = scheduledTasks.get(id)?.getNextRun?.();
  return nextRun ? nextRun.toISOString() : null;
}

async function runJobNow(id) {
  const job = await cronJobService.getJob(id);
  return executeJob(job, "manual_ui");
}

module.exports = {
  getNextRunTime,
  initScheduler,
  refreshJob,
  runJobNow,
  checkAndRunMissedJobs,
  startWatchdog,
  stopWatchdog,
};
