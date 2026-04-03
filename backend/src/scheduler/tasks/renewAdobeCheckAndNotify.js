/**
 * Job: Chạy check tất cả tài khoản Renew Adobe, sau đó:
 *  1. Xóa toàn bộ user khỏi tài khoản hết hạn + xóa mapping.
 *  2. Xóa luôn bản ghi accounts_admin (license_status ≠ Paid) khỏi database.
 *  3. Auto-reassign user sang tài khoản còn gói.
 *  4. Gửi Telegram thông báo hết gói (topic ZERO_DAYS_TOPIC_ID).
 * Chạy mỗi giờ một lần (phút 0, theo timezone scheduler — xem scheduler/index.js).
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
const { runCheckForAccountId } = require("../../controllers/RenewAdobeController");
const { sendAdobeZeroDaysNotification } = require("../../services/telegramOrderNotification");
const adobeRenewV2 = require("../../services/adobe-renew-v2");
const { purgeAndDeleteNoLicenseAdobeAdminAccount } = require("../../services/renewAdobePurgeNoLicenseAccount");
const {
  recordUsersAssigned,
  syncOrdersToMapping,
} = require("../../services/userAccountMappingService");
const { STATUS } = require("../../utils/statuses");


const TABLE_DEF = RENEW_ADOBE_SCHEMA.ACCOUNT;
const TABLE = tableName(TABLE_DEF.TABLE, SCHEMA_RENEW_ADOBE);
const COLS = TABLE_DEF.COLS;

const MAX_USERS_PER_ACCOUNT = 10;

/**
 * Reassign danh sách email vào các tài khoản còn gói còn slot.
 * Ghi nhận vào bảng user_account_mapping.
 */
async function reassignUsersToAvailableAccounts(emailsToReassign) {
  if (emailsToReassign.length === 0) return;

  logger.info("[CRON] Bắt đầu reassign %d user sang tài khoản còn gói", emailsToReassign.length);

  // Lấy tài khoản còn gói (Paid) + còn slot
  const allAccounts = await db(TABLE)
    .select(COLS.ID, COLS.EMAIL, COLS.PASSWORD_ENC, COLS.USER_COUNT,
      COLS.LICENSE_STATUS, COLS.USERS_SNAPSHOT,
      ...(COLS.MAIL_BACKUP_ID ? [COLS.MAIL_BACKUP_ID] : []),
      ...(COLS.ALERT_CONFIG ? [COLS.ALERT_CONFIG] : []),
    )
    .where(COLS.IS_ACTIVE, true)
    .where(COLS.LICENSE_STATUS, "Paid");


  const available = allAccounts
    .map((a) => ({
      ...a,
      currentCount: Math.max(0, parseInt(a[COLS.USER_COUNT], 10) || 0),
    }))
    .filter((a) => a.currentCount < MAX_USERS_PER_ACCOUNT)
    .sort((a, b) => {
      // Ưu tiên tài khoản ít slot trống nhất (fill fullest first)
      const slotsA = MAX_USERS_PER_ACCOUNT - a.currentCount;
      const slotsB = MAX_USERS_PER_ACCOUNT - b.currentCount;
      return slotsA - slotsB;
    });

  if (available.length === 0) {
    logger.warn("[CRON] Không có tài khoản nào còn slot để reassign %d user", emailsToReassign.length);
    return;
  }

  let remaining = [...emailsToReassign];

  for (const account of available) {
    if (remaining.length === 0) break;
    const accId = account[COLS.ID];
    const accEmail = account[COLS.EMAIL];
    const accPwd = account[COLS.PASSWORD_ENC] || "";
    const slotsLeft = MAX_USERS_PER_ACCOUNT - account.currentCount;
    const chunk = remaining.splice(0, slotsLeft);
    if (chunk.length === 0) continue;

    logger.info("[CRON] Reassign %d user vào account %s (%s)", chunk.length, accId, accEmail);
    try {
      const mailBackupId = account[COLS.MAIL_BACKUP_ID] != null ? Number(account[COLS.MAIL_BACKUP_ID]) : null;
      const savedCookies = account[COLS.ALERT_CONFIG]?.cookies || [];
      const v2 = await adobeRenewV2.addUsersWithProductV2(accEmail, accPwd, chunk, {
        savedCookies,
        mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
      });
      if (!v2.success) throw new Error(v2.error || "addUsersWithProductV2 thất bại");

      // Cập nhật DB với snapshot thực từ V2
      const updatePayload = {
        [COLS.USER_COUNT]: v2.userCount ?? (v2.manageTeamMembers?.length ?? 0),
        [COLS.USERS_SNAPSHOT]: JSON.stringify(v2.manageTeamMembers || []),
      };
      if (v2.savedCookies) updatePayload[COLS.ALERT_CONFIG] = v2.savedCookies;
      await db(TABLE).where(COLS.ID, accId).update(updatePayload);

      // Ghi mapping mới vào bảng user_account_mapping (với id_order)
      const emailOrderMap = await buildEmailToOrderMap(chunk);
      for (const userEmail of chunk) {
        const idOrder = emailOrderMap[userEmail.toLowerCase()] || null;
        if (idOrder) {
          await recordUsersAssigned([userEmail], idOrder, accId).catch((e) =>
            logger.warn("[Mapping] recordUsersAssigned failed", { error: e.message })
          );
        } else {
          logger.warn("[Mapping] Không tìm thấy id_order cho email: %s", userEmail);
        }
      }

      logger.info("[CRON] Đã reassign %d user vào account %s thành công", chunk.length, accId);
    } catch (err) {
      logger.error("[CRON] Reassign thất bại cho account %s: %s", accId, err.message);
      // Đưa lại vào remaining để thử account khác nếu còn
      remaining = [...chunk, ...remaining];
      break;
    }
  }

  if (remaining.length > 0) {
    logger.warn("[CRON] Còn %d user chưa được reassign (hết slot hoặc lỗi): %s",
      remaining.length, remaining.join(", "));
  }
}

/**
 * Lấy mapping email → id_order từ order_list (lấy đơn gần nhất còn hiệu lực).
 * Dùng để ghi đúng id_order vào bảng user_account_mapping.
 * @param {string[]} emails
 * @returns {Object} { email: id_order }
 */
async function buildEmailToOrderMap(emails) {
  if (!emails || emails.length === 0) return {};
  const O_TABLE = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
  const O_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;

  const rows = await db(O_TABLE)
    .whereIn(db.raw(`LOWER(${O_COLS.INFORMATION_ORDER})`), emails.map((e) => e.toLowerCase()))
    .whereNotIn(O_COLS.STATUS, [STATUS.EXPIRED, STATUS.CANCELED, STATUS.REFUNDED, STATUS.PENDING_REFUND])

    .orderBy(O_COLS.ORDER_DATE, "desc")
    .select(O_COLS.INFORMATION_ORDER, O_COLS.ID_ORDER);

  const map = {};
  for (const row of rows) {
    const email = (row[O_COLS.INFORMATION_ORDER] || "").toLowerCase().trim();
    if (!map[email]) map[email] = row[O_COLS.ID_ORDER]; // lấy đơn mới nhất
  }
  return map;
}

function createRenewAdobeCheckAndNotifyTask() {
  return async function renewAdobeCheckAndNotifyTask(trigger = "cron") {
    logger.info("[CRON] Bắt đầu job check tài khoản Renew Adobe và thông báo hết gói", { trigger });

    // Bước 0: Đồng bộ đơn hàng mới/hết hạn vào mapping table
    try {
      const syncResult = await syncOrdersToMapping();
      logger.info("[CRON] Sync mapping xong", syncResult);
    } catch (err) {
      logger.warn("[CRON] syncOrdersToMapping thất bại (tiếp tục job)", { error: err.message });
    }
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

    // Track id của những account check thành công (DB đã được cập nhật)
    const checkedIds = [];
    for (const id of activeIds) {
      try {
        await runCheckForAccountId(id);
        checkedIds.push(id);
      } catch (err) {
        logger.warn("[CRON] Check account Adobe thất bại (bỏ qua)", { id, error: err.message });
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    if (checkedIds.length === 0) {
      logger.info("[CRON] Tất cả tài khoản đều check thất bại, không gửi thông báo.");
      return;
    }

    // Tìm tài khoản hết hạn (status ≠ "Paid") trong số đã check thành công
    const selectCols = [
      COLS.ID, COLS.EMAIL, COLS.PASSWORD_ENC, COLS.ORG_NAME,
      COLS.USERS_SNAPSHOT, COLS.LICENSE_STATUS, COLS.USER_COUNT,
    ];
    if (COLS.MAIL_BACKUP_ID) selectCols.push(COLS.MAIL_BACKUP_ID);
    if (COLS.ALERT_CONFIG) selectCols.push(COLS.ALERT_CONFIG);

    const expiredAccounts = await db(TABLE)
      .select(selectCols)
      .whereIn(COLS.ID, checkedIds)
      .whereNot(COLS.LICENSE_STATUS, "Paid");

    logger.info("[CRON] Kết quả sau check:", {
      total_checked: checkedIds.length,
      expired_count: expiredAccounts.length,
      statuses: expiredAccounts.map((r) => ({ id: r[COLS.ID], status: r[COLS.LICENSE_STATUS] })),
    });

    // Bước 1: Xóa user trên Adobe + mapping + bản ghi accounts_admin (hết gói)
    const allEmailsToReassign = [];
    for (const account of expiredAccounts) {
      const { emailsForReassign } = await purgeAndDeleteNoLicenseAdobeAdminAccount(
        account,
        { logPrefix: "[CRON]" }
      );
      allEmailsToReassign.push(...emailsForReassign);
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Bước 2: Reassign user sang tài khoản còn gói
    if (allEmailsToReassign.length > 0) {
      await reassignUsersToAvailableAccounts(allEmailsToReassign);
    }

    // Bước 3: Gửi Telegram thông báo (dữ liệu từ snapshot trước khi xóa DB)
    const toNotify = expiredAccounts
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
