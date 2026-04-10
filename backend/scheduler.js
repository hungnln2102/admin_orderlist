/**
 * Standalone entrypoint cho Scheduler process.
 * Chạy tách biệt khỏi API server để:
 *  - Cron job nặng (Playwright Adobe) không block event loop API
 *  - Scheduler crash không kéo API chết
 *
 * Usage:
 *   node scheduler.js
 *   npm run start:scheduler
 */
require("dotenv").config();

const logger = require("./src/utils/logger");
const { notifyCritical } = require("./src/utils/telegramErrorNotifier");

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

require("./src/scheduler");
