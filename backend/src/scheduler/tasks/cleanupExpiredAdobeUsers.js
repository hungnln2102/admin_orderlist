/**
 * Job: Xóa user khỏi tài khoản Adobe khi đơn hàng đã hết hạn.
 *
 * Luồng:
 * 1. Lấy tất cả email có đơn đang hoạt động từ key_active → order_list
 * 2. Với mỗi Adobe account, parse users_snapshot
 * 3. User nào KHÔNG có email khớp với đơn active → cần xóa
 * 4. Gọi autoDeleteUsers để xóa khỏi Adobe
 *
 * Chạy kèm job 00:01 (sau khi updateDatabaseTask đã mark expired).
 */

const logger = require("../../utils/logger");
const { db } = require("../../db");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  SCHEMA_KEY_ACTIVE,
  KEY_ACTIVE_SCHEMA,
  SCHEMA_ORDERS,
  ORDERS_SCHEMA,
  tableName,
} = require("../../config/dbSchema");
const { autoDeleteUsers } = require("../../services/adobe-http");
const { STATUS } = require("../../utils/statuses");

const ACCT_TABLE = tableName(RENEW_ADOBE_SCHEMA.ACCOUNT.TABLE, SCHEMA_RENEW_ADOBE);
const ACCT = RENEW_ADOBE_SCHEMA.ACCOUNT.COLS;

const TBL_KEY = tableName(KEY_ACTIVE_SCHEMA.ORDER_AUTO_KEYS.TABLE, SCHEMA_KEY_ACTIVE);
const KEY_COLS = KEY_ACTIVE_SCHEMA.ORDER_AUTO_KEYS.COLS;
const TBL_ORDER = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
const ORD_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;

const { runCheckForAccountId } = require("../../controllers/RenewAdobeController");

const INACTIVE_STATUSES = [STATUS.EXPIRED, STATUS.CANCELED, STATUS.REFUNDED];

/**
 * Lấy Set<email_lowercase> có đơn active trong key_active → order_list.
 * "Active" = order tồn tại trong key_active và status KHÔNG phải Hết Hạn/Hủy/Đã Hoàn.
 */
async function getActiveOrderEmails() {
  const rows = await db(TBL_KEY)
    .leftJoin(TBL_ORDER, `${TBL_KEY}.${KEY_COLS.ORDER_CODE}`, `${TBL_ORDER}.${ORD_COLS.ID_ORDER}`)
    .select(`${TBL_ORDER}.${ORD_COLS.INFORMATION_ORDER} as email`)
    .whereNotNull(`${TBL_ORDER}.${ORD_COLS.INFORMATION_ORDER}`)
    .whereNotIn(`${TBL_ORDER}.${ORD_COLS.STATUS}`, INACTIVE_STATUSES);

  const emails = new Set();
  for (const r of rows) {
    const email = (r.email || "").trim().toLowerCase();
    if (email) emails.add(email);
  }
  return emails;
}

function createCleanupExpiredAdobeUsersTask() {
  return async function cleanupExpiredAdobeUsersTask(trigger = "cron") {
    logger.info("[CRON] Bắt đầu cleanup expired Adobe users", { trigger });

    try {
      const activeEmails = await getActiveOrderEmails();
      logger.info("[CRON] Tổng email có đơn active: %d", activeEmails.size);

      const accounts = await db(ACCT_TABLE)
        .select(ACCT.ID, ACCT.EMAIL, ACCT.PASSWORD_ENC, ACCT.USERS_SNAPSHOT, ACCT.IS_ACTIVE, ACCT.ALERT_CONFIG, ACCT.MAIL_BACKUP_ID)
        .where(ACCT.IS_ACTIVE, true)
        .whereNotNull(ACCT.USERS_SNAPSHOT);

      let totalDeleted = 0;
      let totalFailed = 0;

      for (const acc of accounts) {
        let users = [];
        try {
          users = JSON.parse(acc[ACCT.USERS_SNAPSHOT] || "[]");
        } catch {
          continue;
        }
        if (!Array.isArray(users) || users.length === 0) continue;

        const adminEmail = (acc[ACCT.EMAIL] || "").toLowerCase().trim();
        const toDelete = users
          .map((u) => (u.email || "").trim())
          .filter((email) => {
            const lower = email.toLowerCase();
            if (!lower || lower === adminEmail) return false;
            return !activeEmails.has(lower);
          });

        if (toDelete.length === 0) continue;

        logger.info("[CRON] Account %s (%s): xóa %d expired users: %s",
          acc[ACCT.ID], acc[ACCT.EMAIL], toDelete.length, toDelete.join(", "));

        try {
          const password = acc[ACCT.PASSWORD_ENC] || "";
          if (!password) {
            logger.warn("[CRON] Account %s thiếu password, bỏ qua", acc[ACCT.ID]);
            continue;
          }

          const mailBackupId = acc[ACCT.MAIL_BACKUP_ID] != null ? Number(acc[ACCT.MAIL_BACKUP_ID]) : null;
          const result = await autoDeleteUsers(acc[ACCT.EMAIL], password, toDelete, {
            savedCookiesFromDb: acc[ACCT.ALERT_CONFIG] ? acc[ACCT.ALERT_CONFIG] : null,
            mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
          });

          totalDeleted += result.deleted.length;
          totalFailed += result.failed.length;

          logger.info("[CRON] Account %s: deleted=%d, failed=%d",
            acc[ACCT.ID], result.deleted.length, result.failed.length);

          // Re-check account to refresh users_snapshot
          try {
            await runCheckForAccountId(acc[ACCT.ID]);
          } catch (_) {}

          // Delay giữa các account để tránh rate limit
          await new Promise((r) => setTimeout(r, 3000));
        } catch (err) {
          logger.error("[CRON] Lỗi xóa users cho account %s: %s", acc[ACCT.ID], err.message);
        }
      }

      logger.info("[CRON] Cleanup expired Adobe users hoàn tất: deleted=%d, failed=%d", totalDeleted, totalFailed);
    } catch (err) {
      logger.error("[CRON] Cleanup expired Adobe users thất bại", { error: err.message, stack: err.stack });
    }
  };
}

module.exports = { createCleanupExpiredAdobeUsersTask };
