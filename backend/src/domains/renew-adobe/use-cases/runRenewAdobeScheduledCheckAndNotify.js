const logger = require("../../../utils/logger");
const { runCheckForAccountId } = require("../controller");
const { runCheckAllAccountsFlow } = require("../controller/autoAssign");
const { runRenewAdobePostCheckFlow } = require("../../../scheduler/tasks/renewAdobePostCheckFlow");
const {
  ensureAdminAccountsExist,
} = require("../../../scheduler/tasks/shared/adminAccountsGuard");

const ENABLE_POST_CHECK_FIX = process.env.RENEW_ADOBE_ENABLE_POST_CHECK_FIX === "true";

async function runRenewAdobeScheduledCheckAndNotify({ trigger = "cron" } = {}) {
  if (
    !(await ensureAdminAccountsExist({
      taskName: "renewAdobeCheckAndNotifyTask",
      trigger,
    }))
  ) {
    return null;
  }

  const includeAutoAssign = trigger !== "cron";
  const runPostCheckFix = trigger === "cron" && ENABLE_POST_CHECK_FIX;
  logger.info("[CRON] Bắt đầu job check all tài khoản Renew Adobe", {
    trigger,
    pid: process.pid,
    includeAutoAssign,
    runPostCheckFix,
  });

  const result = await runCheckAllAccountsFlow({
    runCheckForAccountId,
    includeAutoAssign,
    logPrefix: "[CRON][check-all]",
  });
  let postCheckFix = null;
  if (runPostCheckFix) {
    postCheckFix = await runRenewAdobePostCheckFlow({ trigger });
  }

  const summary = {
    trigger,
    total: result.total,
    completed: result.completed,
    failed: result.failed,
    autoAssign: result.autoAssign,
    postCheckFix,
  };
  logger.info("[CRON] Kết thúc job check all tài khoản Renew Adobe", summary);
  return summary;
}

module.exports = { runRenewAdobeScheduledCheckAndNotify };
