/**
 * Xóa user trên Adobe + mapping, rồi xóa bản ghi accounts_admin khi tài khoản không còn gói (license ≠ Paid).
 * Dùng chung cho job cron và luồng Check All.
 */

const logger = require("../utils/logger");
const { db } = require("../db");
const adobeRenewV2 = require("./adobe-renew-v2");
const { removeMappingsForAccount } = require("./userAccountMappingService");
const { TABLE, COLS } = require("../controllers/RenewAdobeController/accountTable");

/**
 * @param {object} accountRow — đủ cột: id, email, password_enc, users_snapshot, mail_backup_id?, alert_config?
 * @param {{ logPrefix?: string }} [options]
 * @returns {Promise<{ emailsForReassign: string[]; deletedFromDb: boolean }>}
 */
async function purgeAndDeleteNoLicenseAdobeAdminAccount(
  accountRow,
  { logPrefix = "[renew-adobe-purge]" } = {}
) {
  const id = accountRow[COLS.ID];
  const email = (accountRow[COLS.EMAIL] || "").toString().trim();
  const password = (accountRow[COLS.PASSWORD_ENC] || "").toString().trim();
  const mailBackupId =
    accountRow[COLS.MAIL_BACKUP_ID] != null
      ? Number(accountRow[COLS.MAIL_BACKUP_ID])
      : null;
  const savedCookiesRaw = COLS.ALERT_CONFIG
    ? accountRow[COLS.ALERT_CONFIG]
    : null;

  const removedRows = await removeMappingsForAccount(id);
  let userEmails = removedRows.map((r) => r.user_email).filter(Boolean);

  if (userEmails.length === 0) {
    try {
      const snapshot = JSON.parse(accountRow[COLS.USERS_SNAPSHOT] || "[]");
      userEmails = snapshot
        .map((u) => (u.email || "").trim().toLowerCase())
        .filter(Boolean);
    } catch (_) {
      userEmails = [];
    }
  }

  if (userEmails.length === 0) {
    logger.info(
      "%s Account %s (%s) hết gói, không có user — chỉ xóa bản ghi DB.",
      logPrefix,
      id,
      email
    );
  } else {
    logger.info(
      "%s Xóa %d user Adobe cho account %s (%s) (hết gói)",
      logPrefix,
      userEmails.length,
      id,
      email
    );
    try {
      await adobeRenewV2.autoDeleteUsers(email, password, userEmails, {
        savedCookiesFromDb: savedCookiesRaw,
        mailBackupId: Number.isFinite(mailBackupId) ? mailBackupId : null,
      });
    } catch (err) {
      logger.error(
        "%s autoDeleteUsers thất bại account %s: %s",
        logPrefix,
        id,
        err.message
      );
    }
  }

  let deletedFromDb = false;
  try {
    const removed = await db(TABLE).where(COLS.ID, id).del();
    deletedFromDb = removed > 0;
    if (deletedFromDb) {
      logger.info("%s Đã xóa accounts_admin id=%s (%s)", logPrefix, id, email);
    }
  } catch (err) {
    logger.error(
      "%s Không xóa được accounts_admin id=%s: %s",
      logPrefix,
      id,
      err.message
    );
  }

  return { emailsForReassign: userEmails, deletedFromDb };
}

module.exports = { purgeAndDeleteNoLicenseAdobeAdminAccount };
