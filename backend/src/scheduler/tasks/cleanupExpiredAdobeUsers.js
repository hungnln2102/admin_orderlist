/**
 * Job: Xóa user khỏi tài khoản Adobe khi đơn hàng đã hết hạn.
 *
 * Luồng:
 * 1. Từ users_snapshot lấy danh sách email, check vào order_list (variant_id trong product_system renew_adobe)
 * 2. Giữ lại user có đơn: status in [Đã Thanh Toán, Cần Gia Hạn, Đang Xử Lý] VÀ expiry_date > hôm nay (số ngày còn lại > 0)
 * 3. User có đơn status "Hết Hạn" hoặc expiry_date <= hôm nay → xóa khỏi tài khoản
 * 4. Check 1 lượt xong, xóa từng tài khoản (autoDeleteUsers nhận array emails, xóa tuần tự)
 *
 * Chạy kèm job 00:01 (hoặc 23:30 tùy cấu hình).
 */

const logger = require("../../utils/logger");
const { db } = require("../../db");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  SCHEMA_ORDERS,
  ORDERS_SCHEMA,
  tableName,
} = require("../../config/dbSchema");
const { autoDeleteUsers } = require("../../services/adobe-http");
const { STATUS } = require("../../utils/statuses");


const ACCT_TABLE = tableName(RENEW_ADOBE_SCHEMA.ACCOUNT.TABLE, SCHEMA_RENEW_ADOBE);
const ACCT = RENEW_ADOBE_SCHEMA.ACCOUNT.COLS;

const PS_TABLE = tableName(RENEW_ADOBE_SCHEMA.PRODUCT_SYSTEM.TABLE, SCHEMA_RENEW_ADOBE);
const PS_COLS = RENEW_ADOBE_SCHEMA.PRODUCT_SYSTEM.COLS;

const TBL_ORDER = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
const ORD_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;

const RENEW_ADOBE_SYSTEM_CODE = "renew_adobe";

/** Trạng thái đơn được coi là active (số ngày còn lại > 0) */
const ALLOWED_ORDER_STATUSES = [STATUS.PAID, STATUS.RENEWAL, STATUS.PROCESSING];


const { runCheckForAccountId } = require("../../controllers/RenewAdobeController");

/**
 * Lấy Set<email_lowercase> có đơn active: variant renew_adobe, status allowed, expiry_date > hôm nay.
 * User KHÔNG trong set này (đơn Hết Hạn hoặc expiry <= today) → xóa khỏi tài khoản.
 */
async function getActiveOrderEmails() {
  const variantRows = await db(PS_TABLE)
    .where(PS_COLS.SYSTEM_CODE, RENEW_ADOBE_SYSTEM_CODE)
    .select(PS_COLS.VARIANT_ID);
  const variantIds = variantRows.map((r) => r[PS_COLS.VARIANT_ID]).filter((id) => id != null);
  if (variantIds.length === 0) return new Set();

  const rows = await db(TBL_ORDER)
    .select(ORD_COLS.INFORMATION_ORDER)
    .whereIn(ORD_COLS.ID_PRODUCT, variantIds)
    .whereIn(ORD_COLS.STATUS, ALLOWED_ORDER_STATUSES)
    .whereNotNull(ORD_COLS.INFORMATION_ORDER)
    .whereRaw(
      `(${TBL_ORDER}.${ORD_COLS.EXPIRY_DATE})::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh' > (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`
    );

  const emails = new Set();
  for (const r of rows) {
    const email = (r[ORD_COLS.INFORMATION_ORDER] || "").trim().toLowerCase();
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

          // Sync user_account_mapping: đánh dấu product=false cho user đã xóa
          if (result.deleted.length > 0) {
            const MAP = RENEW_ADOBE_SCHEMA.USER_ACCOUNT_MAPPING;
            const MAP_TABLE = tableName(MAP.TABLE, SCHEMA_RENEW_ADOBE);
            const MAP_COLS = MAP.COLS;
            const deletedLower = result.deleted.map((e) => e.toLowerCase());
            try {
              const updated = await db(MAP_TABLE)
                .whereIn(db.raw(`LOWER(${MAP_COLS.USER_EMAIL})`), deletedLower)
                .andWhere(MAP_COLS.ADOBE_ACCOUNT_ID, acc[ACCT.ID])
                .update({ [MAP_COLS.PRODUCT]: false, [MAP_COLS.UPDATED_AT]: new Date() });
              logger.info("[CRON] Account %s: user_account_mapping updated=%d rows (product→false)", acc[ACCT.ID], updated);
            } catch (mapErr) {
              logger.error("[CRON] Account %s: sync mapping failed: %s", acc[ACCT.ID], mapErr.message);
            }
          }

          if (result.savedCookies) {
            try {
              await db(ACCT_TABLE).where(ACCT.ID, acc[ACCT.ID]).update({
                [ACCT.ALERT_CONFIG]: result.savedCookies,
              });
            } catch (_) {}
          }
          if (result.snapshot && Array.isArray(result.snapshot.manageTeamMembers)) {
            try {
              await db(ACCT_TABLE).where(ACCT.ID, acc[ACCT.ID]).update({
                [ACCT.USERS_SNAPSHOT]: JSON.stringify(result.snapshot.manageTeamMembers),
                ...(result.snapshot.orgName != null && { [ACCT.ORG_NAME]: result.snapshot.orgName }),
                ...(result.snapshot.licenseStatus != null && { [ACCT.LICENSE_STATUS]: result.snapshot.licenseStatus }),
                [ACCT.USER_COUNT]: result.snapshot.manageTeamMembers.length,
              });
            } catch (_) {}
          } else {
            try {
              await runCheckForAccountId(acc[ACCT.ID]);
            } catch (_) {}
          }

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
