/**
 * Repository — truy xuất `mail_backup` row theo id (chỉ row is_active).
 * Trả về object thuần để các handler dùng (không leak Knex builder ra ngoài).
 */

const logger = require("../../../utils/logger");
const { db } = require("../../../db");
const { MAIL_BACKUP_TABLE, MB_COLS } = require("../shared/constants");

/**
 * Lấy thông tin mailbox từ bảng mail_backup theo id (chỉ dòng is_active).
 * email = dùng cho IMAP login (thay MAILTEST); alias_prefix = dùng để filter thư lấy OTP.
 * @param {number} mailBackupId
 * @returns {Promise<{ email: string, app_password: string, provider: string, alias_prefix?: string }|null>}
 */
async function getMailBackupById(mailBackupId) {
  if (!MAIL_BACKUP_TABLE || !mailBackupId) return null;
  try {
    const row = await db(MAIL_BACKUP_TABLE)
      .where(MB_COLS.ID, mailBackupId)
      .where(MB_COLS.IS_ACTIVE, true)
      .first();
    if (!row || !row[MB_COLS.EMAIL] || !row[MB_COLS.APP_PASSWORD]) return null;
    const aliasPrefix = MB_COLS.ALIAS_PREFIX && row[MB_COLS.ALIAS_PREFIX] != null ? String(row[MB_COLS.ALIAS_PREFIX]).trim() : "";
    return {
      email: row[MB_COLS.EMAIL],
      app_password: row[MB_COLS.APP_PASSWORD],
      provider: row[MB_COLS.PROVIDER] || "gmail",
      ...(aliasPrefix ? { alias_prefix: aliasPrefix } : {}),
    };
  } catch (err) {
    logger.warn("[mailOtpService] getMailBackupById lỗi: %s", err.message);
    return null;
  }
}

module.exports = {
  getMailBackupById,
};
