/**
 * Liệt kê metadata (from, subject, date) của N mail gần nhất — để debug xem IMAP trả về gì.
 */

const logger = require("@/utils/logger");
const { toUidList, getImapHostFromProvider, createImapClient } = require("@/services/mailOtpService/shared/imapClient");
const { getMailBackupById } = require("@/services/mailOtpService/repository/mailBackupRepo");

/**
 * @param {number} mailBackupId
 * @param {Object} [options] { minutesBack: number, limit: number }
 * @returns {Promise<Array<{ from: string, subject: string, date: Date }>>}
 */
async function listRecentEmails(mailBackupId, options = {}) {
  const minutesBack = options.minutesBack != null ? options.minutesBack : 60;
  const limit = options.limit != null ? options.limit : 20;
  const backup = await getMailBackupById(mailBackupId);
  if (!backup) return [];
  const host = getImapHostFromProvider(backup.provider);
  const { user, app_password: pass } = backup;
  if (!host || !user || !pass) return [];
  try {
    const client = createImapClient({ host, user, pass });
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      let uidList = [];
      const since = new Date(Date.now() - minutesBack * 60 * 1000);
      let list = await client.search({ since }, { uid: true });
      uidList = toUidList(list);
      if (uidList.length === 0) {
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        list = await client.search({ since: since24h }, { uid: true });
        uidList = toUidList(list);
      }
      if (uidList.length === 0) {
        list = await client.search({ all: true }, { uid: true });
        uidList = toUidList(list);
      }
      const result = [];
      const { simpleParser } = require("mailparser");
      const pushParsed = (parsed) => {
        const fromHeader = [parsed.from?.text, parsed.from?.value?.map((a) => a.address).join(" ")].filter(Boolean).join(" ");
        result.push({ from: fromHeader, subject: (parsed.subject || "").slice(0, 80), date: parsed.date || new Date() });
      };
      if (uidList.length > 0) {
        const uids = uidList.slice(-Math.min(limit, 50));
        for (let i = uids.length - 1; i >= 0 && result.length < limit; i--) {
          const msg = await client.fetchOne(uids[i], { source: true }, { uid: true });
          if (!msg?.source) continue;
          try {
            const parsed = await simpleParser(Buffer.isBuffer(msg.source) ? msg.source : Buffer.from(msg.source));
            pushParsed(parsed);
          } catch (_) {}
        }
      } else {
        const exists = client.mailbox?.exists ?? 0;
        if (exists > 0) {
          const start = Math.max(1, exists - Math.min(limit, 50) + 1);
          const range = `${start}:${exists}`;
          const collected = [];
          for await (const msg of client.fetch(range, { source: true })) {
            if (msg?.source) collected.push(msg.source);
          }
          for (let j = collected.length - 1; j >= 0 && result.length < limit; j--) {
            try {
              const parsed = await simpleParser(Buffer.isBuffer(collected[j]) ? collected[j] : Buffer.from(collected[j]));
              pushParsed(parsed);
            } catch (_) {}
          }
        }
      }
      return result;
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (err) {
    logger.warn("[mailOtpService] listRecentEmails lỗi: %s", err.message);
    return [];
  }
}

module.exports = { listRecentEmails };
