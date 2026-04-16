/**
 * Job (cron): check tuần tự từng tài khoản — runCheckForAccountId giống POST /accounts/:id/check.
 * Trigger `cron`: sau check có thể chạy flow auto-fix bằng batch add qua env `RENEW_ADOBE_ENABLE_POST_CHECK_FIX`.
 * Trigger `manual` (API /scheduler/run-adobe-check): giữ hành vi cũ (includeAutoAssign=true).
 */
const logger = require("../../utils/logger");
const { runCheckForAccountId } = require("../../controllers/RenewAdobeController");
const { runCheckAllAccountsFlow } = require("../../controllers/RenewAdobeController/autoAssign");
const { runRenewAdobePostCheckFlow } = require("./renewAdobePostCheckFlow");

const ENABLE_POST_CHECK_FIX = process.env.RENEW_ADOBE_ENABLE_POST_CHECK_FIX === "true";

/** Tránh hai lần gọi chồng nhau (cron mỗi giờ + job chạy lâu → Playwright/OOM/timeout). */
let renewAdobeCheckAllInFlight = false;

function createRenewAdobeCheckAndNotifyTask() {
  return async function renewAdobeCheckAndNotifyTask(trigger = "cron") {
    if (renewAdobeCheckAllInFlight) {
      logger.warn(
        "[CRON] Job Renew Adobe (check all) vẫn đang chạy — bỏ qua lần gọi trùng",
        { trigger, pid: process.pid }
      );
      return;
    }
    const includeAutoAssign = trigger !== "cron";
    const runPostCheckFix = trigger === "cron" && ENABLE_POST_CHECK_FIX;
    renewAdobeCheckAllInFlight = true;
    logger.info("[CRON] Bắt đầu job check all tài khoản Renew Adobe", {
      trigger,
      pid: process.pid,
      includeAutoAssign,
      runPostCheckFix,
    });
    try {
      const result = await runCheckAllAccountsFlow({
        runCheckForAccountId,
        includeAutoAssign,
        logPrefix: "[CRON][check-all]",
      });
      let postCheckFix = null;
      if (runPostCheckFix) {
        postCheckFix = await runRenewAdobePostCheckFlow({ trigger });
      }
      logger.info("[CRON] Kết thúc job check all tài khoản Renew Adobe", {
        trigger,
        total: result.total,
        completed: result.completed,
        failed: result.failed,
        autoAssign: result.autoAssign,
        postCheckFix,
      });
    } finally {
      renewAdobeCheckAllInFlight = false;
    }
  };
}

module.exports = { createRenewAdobeCheckAndNotifyTask };
