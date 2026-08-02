/**
 * Helper IMAP dùng chung cho mọi handler trong `mailOtpService/`.
 * - `toUidList`: chuẩn hóa kết quả search ImapFlow (array vs object.uidList).
 * - `getImapHostFromProvider`: map provider name → IMAP host.
 * - `createImapClient`: factory tạo ImapFlow client với env mặc định (port/TLS).
 */

/** Chuẩn hóa kết quả search: ImapFlow có thể trả về mảng trực tiếp hoặc object có .uidList */
function toUidList(list) {
  if (Array.isArray(list)) return list;
  if (list && Array.isArray(list.uidList)) return list.uidList;
  return [];
}

/** Map provider (gmail, outlook, ...) sang IMAP host */
function getImapHostFromProvider(provider) {
  if (!provider) return process.env.ADOBE_OTP_IMAP_HOST || "imap.gmail.com";
  const p = String(provider).toLowerCase();
  if (p.includes("gmail")) return "imap.gmail.com";
  if (p.includes("outlook") || p.includes("office365") || p.includes("hotmail")) return "imap-mail.outlook.com";
  if (p.includes("yahoo")) return "imap.mail.yahoo.com";
  return process.env.ADOBE_OTP_IMAP_HOST || "imap.gmail.com";
}

/**
 * Tạo ImapFlow client với cấu hình kết nối lấy từ env (port/TLS); giữ logger=false như code gốc.
 * Lưu ý: lazy-require `imapflow` để không bắt module này load khi không cần (giống code cũ).
 * @param {{ host: string, user: string, pass: string }} creds
 * @returns {import('imapflow').ImapFlow}
 */
function createImapClient({ host, user, pass }) {
  const { ImapFlow } = require("imapflow");
  return new ImapFlow({
    host,
    port: parseInt(process.env.ADOBE_OTP_IMAP_PORT || "993", 10),
    secure: process.env.ADOBE_OTP_IMAP_TLS !== "false",
    auth: { user, pass },
    logger: false,
  });
}

module.exports = {
  toUidList,
  getImapHostFromProvider,
  createImapClient,
};
