/**
 * Debug kết nối IMAP: trả về kết quả search, mailbox.exists để tìm nguyên nhân
 * không lấy được mail (sai user/pass, alias trống, mailbox rỗng, ...).
 */

const { toUidList, getImapHostFromProvider, createImapClient } = require("../shared/imapClient");
const { getMailBackupById } = require("../repository/mailBackupRepo");

/**
 * @param {number} mailBackupId
 * @returns {Promise<{ searchAllType: string, searchAllLength: number, uidListLength: number, mailboxExists: number, error?: string }>}
 */
async function getConnectionDebug(mailBackupId) {
  const backup = await getMailBackupById(mailBackupId);
  if (!backup) return { searchAllType: "", searchAllLength: 0, uidListLength: 0, mailboxExists: 0, error: "getMailBackupById null" };
  const host = getImapHostFromProvider(backup.provider);
  const { user, app_password: pass } = backup;
  if (!host || !user || !pass) return { searchAllType: "", searchAllLength: 0, uidListLength: 0, mailboxExists: 0, error: "missing credentials" };
  try {
    const client = createImapClient({ host, user, pass });
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const list = await client.search({ all: true }, { uid: true });
      const uidList = toUidList(list);
      const mailboxExists = client.mailbox?.exists ?? -1;
      return {
        searchAllType: Array.isArray(list) ? "array" : (list && typeof list.uidList !== "undefined" ? "object.uidList" : typeof list),
        searchAllLength: Array.isArray(list) ? list.length : (list?.uidList?.length ?? 0),
        uidListLength: uidList.length,
        mailboxExists,
      };
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (err) {
    return { searchAllType: "", searchAllLength: 0, uidListLength: 0, mailboxExists: 0, error: err.message };
  }
}

module.exports = { getConnectionDebug };
