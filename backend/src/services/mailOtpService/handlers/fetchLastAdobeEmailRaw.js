/**
 * Lấy toàn bộ nội dung mail Adobe gần nhất (HTML + text) — dùng để debug.
 * Chỉ lấy mail từ `message@adobe.com` / `@adobe.com` hoặc From chứa "Adobe".
 */

const logger = require("@/utils/logger");
const { toUidList, getImapHostFromProvider, createImapClient } = require("@/services/mailOtpService/shared/imapClient");
const { getMailBackupById } = require("@/services/mailOtpService/repository/mailBackupRepo");

/**
 * @param {number} mailBackupId - ID bản ghi trong mail_backup (bắt buộc).
 * @param {Object} [options]
 * @param {number} [options.minutesBack=60]
 * @returns {Promise<{ html: string, text: string, subject: string, from: string, date: Date }|null>}
 */
async function fetchLastAdobeEmailRaw(mailBackupId, options = {}) {
  const minutesBack = options.minutesBack != null ? options.minutesBack : 60;
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
      let uidList = [];
      let list = await client.search({ since: new Date(Date.now() - minutesBack * 60 * 1000) }, { uid: true });
      uidList = toUidList(list);
      if (uidList.length === 0) {
        list = await client.search({ since: new Date(Date.now() - 24 * 60 * 60 * 1000) }, { uid: true });
        uidList = toUidList(list);
      }
      if (uidList.length === 0) {
        list = await client.search({ all: true }, { uid: true });
        uidList = toUidList(list);
      }
      const { simpleParser } = require("mailparser");
      const tryParseAdobe = async (raw) => {
        const parsed = await simpleParser(Buffer.isBuffer(raw) ? raw : Buffer.from(raw));
        const fromHeader = [parsed.from?.text, parsed.from?.value?.map((a) => a.address).join(" ")].filter(Boolean).join(" ");
        const fromLower = (fromHeader || "").toLowerCase();
        if (!/message@adobe\.com|@adobe\.com/.test(fromLower) && !fromLower.includes("adobe")) return null;
        return { html: parsed.html || "", text: parsed.text || "", subject: parsed.subject || "", from: fromHeader, date: parsed.date || new Date() };
      };
      if (uidList.length > 0) {
        const uids = uidList.slice(-50);
        for (let i = uids.length - 1; i >= 0; i--) {
          const msg = await client.fetchOne(uids[i], { source: true }, { uid: true });
          if (!msg?.source) continue;
          try {
            const out = await tryParseAdobe(msg.source);
            if (out) return out;
          } catch (_) {}
        }
      } else {
        const exists = client.mailbox?.exists ?? 0;
        if (exists > 0) {
          const start = Math.max(1, exists - 49);
          const range = `${start}:${exists}`;
          const collected = [];
          for await (const msg of client.fetch(range, { source: true })) {
            if (msg?.source) collected.push(msg.source);
          }
          for (let j = collected.length - 1; j >= 0; j--) {
            try {
              const out = await tryParseAdobe(collected[j]);
              if (out) return out;
            } catch (_) {}
          }
        }
      }
      return null;
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (err) {
    logger.warn("[mailOtpService] fetchLastAdobeEmailRaw lỗi: %s", err.message);
    return null;
  }
}

module.exports = { fetchLastAdobeEmailRaw };
