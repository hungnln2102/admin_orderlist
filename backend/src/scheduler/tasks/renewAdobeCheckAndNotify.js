/**
 * Job: Chạy check tất cả tài khoản Renew Adobe, sau đó gửi Telegram cho tài khoản không còn gói (topic ZERO_DAYS_TOPIC_ID).
 * Chạy lúc 05:00 và 12:00 (theo timezone scheduler).
 */

const logger = require("../../utils/logger");
const { db } = require("../../db");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  tableName,
} = require("../../config/dbSchema");
const { runCheckForAccountId } = require("../../controllers/RenewAdobeController");
const { sendAdobeZeroDaysNotification } = require("../../services/telegramOrderNotification");

const TABLE_DEF = RENEW_ADOBE_SCHEMA.ACCOUNT;
const TABLE = tableName(TABLE_DEF.TABLE, SCHEMA_RENEW_ADOBE);
const COLS = TABLE_DEF.COLS;

/** Trạng thái coi là "còn gói" — nếu khác thì gửi thông báo hết gói. */
const PAID_STATUS = "Paid";

function createRenewAdobeCheckAndNotifyTask() {
  return async function renewAdobeCheckAndNotifyTask(trigger = "cron") {
    logger.info("[CRON] Bắt đầu job check tài khoản Renew Adobe và thông báo hết gói", { trigger });

    const rows = await db(TABLE)
      .select(COLS.ID, COLS.EMAIL, COLS.PASSWORD_ENC, COLS.IS_ACTIVE)
      .whereNotNull(COLS.EMAIL)
      .whereNotNull(COLS.PASSWORD_ENC);

    const activeIds = rows
      .filter((r) => r[COLS.IS_ACTIVE] !== false && r[COLS.IS_ACTIVE] !== 0)
      .map((r) => r[COLS.ID]);

    if (activeIds.length === 0) {
      logger.info("[CRON] Không có tài khoản active để check.");
      return;
    }

    for (const id of activeIds) {
      try {
        await runCheckForAccountId(id);
      } catch (err) {
        logger.warn("[CRON] Check account Adobe thất bại (bỏ qua)", { id, error: err.message });
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    const expired = await db(TABLE)
      .select(COLS.ID, COLS.EMAIL, COLS.ORG_NAME, COLS.USERS_SNAPSHOT, COLS.LICENSE_STATUS)
      .whereNot(COLS.LICENSE_STATUS, PAID_STATUS);

    const toNotify = expired
      .filter((r) => (r[COLS.EMAIL] || "").toString().trim())
      .map((r) => ({
        email: (r[COLS.EMAIL] || "").toString().trim(),
        org_name: (r[COLS.ORG_NAME] || "").toString().trim() || "—",
        users_snapshot: r[COLS.USERS_SNAPSHOT],
      }));

    if (toNotify.length > 0) {
      logger.info("[CRON] Gửi Telegram thông báo hết gói", { count: toNotify.length });
      await sendAdobeZeroDaysNotification(toNotify);
    } else {
      logger.info("[CRON] Không có tài khoản Adobe hết gói cần thông báo.");
    }
  };
}

module.exports = { createRenewAdobeCheckAndNotifyTask };
