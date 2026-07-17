/**
 * Đăng nhập IMAP bằng env (MAILTEST, APPPASSWORD) → lấy thư gần nhất.
 * Nếu có `mail_backup_id` (`mailBackupIdForFilter`) thì lấy email từ bảng để lọc thư to/from trùng.
 */

const logger = require("@/utils/logger");
const { createImapClient } = require("@/services/mailOtpService/shared/imapClient");
const { getMailBackupById } = require("@/services/mailOtpService/repository/mailBackupRepo");

/**
 * @param {Object} [options]
 * @param {number|null} [options.mailBackupIdForFilter] - Nếu set, lấy email từ mail_backup để chỉ giữ thư to/from trùng email đó.
 * @param {number} [options.limit=20]
 * @returns {Promise<{ count: number, emails: Array<{ from: string, to: string, subject: string, date: Date, html?: string, text?: string }>, newest: object|null }>}
 */
async function fetchRecentWithEnvLogin(options = {}) {
  const mailBackupId = options.mailBackupIdForFilter ?? null;
  const limit = options.limit ?? 20;
  const user = process.env.ADOBE_OTP_IMAP_USER || process.env.MAILTEST;
  const pass = process.env.ADOBE_OTP_IMAP_PASSWORD || process.env.APPPASSWORD || process.env["2FA"];
  const host = process.env.ADOBE_OTP_IMAP_HOST || "imap.gmail.com";
  if (!user || !pass) {
    return { count: 0, emails: [], newest: null };
  }
  let filterBy = null;
  if (mailBackupId) {
    const backup = await getMailBackupById(mailBackupId);
    if (backup) {
      const ap = backup.alias_prefix ? String(backup.alias_prefix).trim() : "";
      filterBy = ap ? ap.toLowerCase() : (backup.email ? backup.email.toLowerCase().trim() : null);
    }
  }
  try {
    const client = createImapClient({ host, user, pass });
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const info = await client.status("INBOX", { messages: true });
      const count = info.messages ?? 0;
      const result = [];
      if (count > 0) {
        const exists = client.mailbox?.exists ?? count;
        const start = Math.max(1, exists - limit + 1);
        const range = `${start}:${exists}`;
        const { simpleParser } = require("mailparser");
        for await (const msg of client.fetch(range, { source: true })) {
          if (!msg?.source) continue;
          try {
            const parsed = await simpleParser(Buffer.isBuffer(msg.source) ? msg.source : Buffer.from(msg.source));
            const from = [parsed.from?.text, parsed.from?.value?.map((a) => a.address).join(" ")].filter(Boolean).join(" ");
            const to = [parsed.to?.text, parsed.to?.value?.map((a) => a.address).join(" ")].filter(Boolean).join(" ");
            const subject = parsed.subject || "";
            const date = parsed.date || new Date();
            if (filterBy) {
              const fromTo = (from + " " + to).toLowerCase();
              if (!fromTo.includes(filterBy)) continue;
            }
            result.push({
              from,
              to,
              subject: subject.slice(0, 120),
              date,
              html: parsed.html || "",
              text: parsed.text || "",
            });
          } catch (_) {}
        }
        result.reverse();
      }
      const newest = result.length > 0 ? result[0] : null;
      return { count, emails: result, newest };
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (err) {
    logger.warn("[mailOtpService] fetchRecentWithEnvLogin lỗi: %s", err.message);
    return { count: 0, emails: [], newest: null };
  }
}

module.exports = { fetchRecentWithEnvLogin };
