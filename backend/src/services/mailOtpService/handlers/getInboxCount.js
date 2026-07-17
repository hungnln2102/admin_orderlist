/**
 * Đếm số thư trong INBOX của một mail_backup row.
 * Dùng để debug / hiển thị "có bao nhiêu mail" trên UI test IMAP.
 */

const logger = require("@/utils/logger");
const { getImapHostFromProvider, createImapClient } = require("@/services/mailOtpService/shared/imapClient");
const { getMailBackupById } = require("@/services/mailOtpService/repository/mailBackupRepo");

/**
 * Đếm số thư trong INBOX (cùng cách với test-imap-login: dùng status("INBOX", { messages: true })).
 * @param {number} mailBackupId
 * @returns {Promise<number|null>} Số thư hoặc null nếu lỗi.
 */
async function getInboxCount(mailBackupId) {
  const backup = await getMailBackupById(mailBackupId);
  if (!backup) return null;
  const host = getImapHostFromProvider(backup.provider);
  const { user, app_password: pass } = backup;
  if (!host || !user || !pass) return null;
  try {
    const client = createImapClient({ host, user, pass });
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const info = await client.status("INBOX", { messages: true });
      return info.messages ?? null;
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (err) {
    logger.warn("[mailOtpService] getInboxCount lỗi: %s", err.message);
    return null;
  }
}

module.exports = { getInboxCount };
