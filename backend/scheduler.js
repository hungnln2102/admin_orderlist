/**
 * Standalone entrypoint cho Scheduler process.
 * Chạy tách biệt khỏi API server để:
 *  - Cron job nặng (Playwright Adobe) không block event loop API
 *  - Scheduler crash không kéo API chết
 *
 * Usage:
 *   node scheduler.js
 *   npm run start:scheduler
 *   node scheduler.js --run-adobe-once   # chạy một lần job check Adobe giống cron (không đăng ký cron khác)
 *   npm run start:scheduler:adobe-once
 *   node scheduler.js --run-cron-once   # một lần: cập nhật EXPIRED/RENEWAL + backup DB (nếu ENABLE_DB_BACKUP=true)
 *   npm run start:scheduler:cron-once
 *   node scheduler.js --run-daily-revenue-once   # một lần: UPSERT dashboard.daily_revenue_summary (mốc thuế → hôm nay)
 *   npm run start:scheduler:daily-revenue-once
 *   node scheduler.js --run-four-days-once   # một lần: Telegram đơn cần gia hạn (còn 4 ngày), bỏ qua chốt ngày
 *   npm run start:scheduler:four-days-once
 */
// Cùng .env + .env.local với API — không phụ thuộc cwd khi systemd/docker đổi thư mục làm việc.
const { loadBackendEnv } = require("./src/config/loadEnv");
loadBackendEnv();

const logger = require("./src/utils/logger");
const { notifyCritical } = require("./src/domains/notifications/telegram").systemNotifier;

// Đăng ký toàn bộ event subscribers
const { registerAllSubscribers } = require("./src/events");
registerAllSubscribers();

process.on("uncaughtException", (err) => {
  logger.error("[SCHEDULER][FATAL] uncaughtException", {
    error: err.message,
    stack: err.stack,
  });
  notifyCritical({
    message: `[Scheduler] uncaughtException: ${err.message}`,
    stack: err.stack,
    extra: "Scheduler sẽ tắt trong 3 giây",
  });
  setTimeout(() => process.exit(1), 3000);
});

process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  logger.error("[SCHEDULER][FATAL] unhandledRejection", { error: msg, stack });
  notifyCritical({ message: `[Scheduler] unhandledRejection: ${msg}`, stack });
});

if (process.argv.includes("--run-cron-once")) {
  const { updateDatabaseTask } = require("./src/scheduler/taskInstances");
  logger.info(
    "[Scheduler] CLI --run-cron-once: cùng tác vụ CRON_SCHEDULE (EXPIRED/RENEWAL + backup nếu ENABLE_DB_BACKUP=true)"
  );
  updateDatabaseTask("manual")
    .then(() => {
      logger.info("[Scheduler] CLI --run-cron-once hoàn thành.");
      process.exit(0);
    })
    .catch((err) => {
      logger.error("[Scheduler] CLI --run-cron-once thất bại", {
        error: err.message,
        stack: err.stack,
      });
      process.exit(1);
    });
} else if (process.argv.includes("--run-adobe-once")) {
  const { renewAdobeCheckAndNotifyTask } = require("./src/scheduler/taskInstances");
  logger.info(
    "[Scheduler] CLI --run-adobe-once: chạy job check tài khoản Adobe (cùng logic trigger=cron, dùng backend/.env hiện tại)"
  );
  renewAdobeCheckAndNotifyTask("cron")
    .then(() => {
      logger.info("[Scheduler] CLI --run-adobe-once hoàn thành.");
      process.exit(0);
    })
    .catch((err) => {
      logger.error("[Scheduler] CLI --run-adobe-once thất bại", {
        error: err.message,
        stack: err.stack,
      });
      process.exit(1);
    });
} else if (process.argv.includes("--run-daily-revenue-once")) {
  const { syncDailyRevenueSummaryTask } = require("./src/scheduler/taskInstances");
  logger.info(
    "[Scheduler] CLI --run-daily-revenue-once: UPSERT daily_revenue_summary (mốc env hoặc 2026-04-22 → hôm nay VN)"
  );
  syncDailyRevenueSummaryTask("manual")
    .then(() => {
      logger.info("[Scheduler] CLI --run-daily-revenue-once hoàn thành.");
      process.exit(0);
    })
    .catch((err) => {
      logger.error("[Scheduler] CLI --run-daily-revenue-once thất bại", {
        error: err.message,
        stack: err.stack,
      });
      process.exit(1);
    });
} else if (process.argv.includes("--run-four-days-once")) {
  const { notifyFourDaysRemainingTask } = require("./src/scheduler/taskInstances");
  logger.info(
    "[Scheduler] CLI --run-four-days-once: gửi Telegram đơn cần gia hạn (còn 4 ngày), trigger=manual"
  );
  notifyFourDaysRemainingTask("manual")
    .then(() => {
      logger.info("[Scheduler] CLI --run-four-days-once hoàn thành.");
      process.exit(0);
    })
    .catch((err) => {
      logger.error("[Scheduler] CLI --run-four-days-once thất bại", {
        error: err.message,
        stack: err.stack,
      });
      process.exit(1);
    });
} else {
  require("./src/scheduler");
}
