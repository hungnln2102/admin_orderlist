/**
 * Barrel — giữ contract module cũ `require("./mailOtpService")`.
 *
 * Service đọc mail qua IMAP, lấy OTP từ hộp thư.
 * Độc lập với luồng login Adobe; có thể dùng từ bất kỳ module nào (Adobe check, hoặc API khác).
 *
 * Cấu trúc nội bộ:
 * - `shared/`      → helper thuần (IMAP client factory, OTP text extractor).
 * - `repository/`  → truy xuất bảng `mail_backup`.
 * - `handlers/`    → mỗi file = một capability (fetchOtp, getInboxCount, …).
 */

const { getImapHostFromProvider } = require("./shared/imapClient");
const { extractOtpFromText } = require("./shared/otpExtractor");
const { getMailBackupById } = require("./repository/mailBackupRepo");
const {
  fetchOtpFromEmail,
  fetchOtpFromAdobeEmail,
  hasOtpConfig,
} = require("./handlers/fetchOtpFromEmail");
const { getInboxCount } = require("./handlers/getInboxCount");
const { getConnectionDebug } = require("./handlers/getConnectionDebug");
const { listRecentEmails } = require("./handlers/listRecentEmails");
const { fetchLastAdobeEmailRaw } = require("./handlers/fetchLastAdobeEmailRaw");
const { fetchRecentWithEnvLogin } = require("./handlers/fetchRecentWithEnvLogin");

module.exports = {
  getImapHostFromProvider,
  getMailBackupById,
  extractOtpFromText,
  fetchOtpFromEmail,
  fetchOtpFromAdobeEmail,
  hasOtpConfig,
  getInboxCount,
  getConnectionDebug,
  listRecentEmails,
  fetchLastAdobeEmailRaw,
  fetchRecentWithEnvLogin,
};
