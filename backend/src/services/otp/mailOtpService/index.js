/**
 * Barrel — giữ contract module cũ `require("@/services/mailOtpService/mailOtpService")`.
 *
 * Service đọc mail qua IMAP, lấy OTP từ hộp thư.
 * Độc lập với luồng login Adobe; có thể dùng từ bất kỳ module nào (Adobe check, hoặc API khác).
 *
 * Cấu trúc nội bộ:
 * - `shared/`      → helper thuần (IMAP client factory, OTP text extractor).
 * - `repository/`  → truy xuất bảng `mail_backup`.
 * - `handlers/`    → mỗi file = một capability (fetchOtp, getInboxCount, …).
 */

const { getImapHostFromProvider } = require("@/services/otp/mailOtpService/shared/imapClient");
const { extractOtpFromText } = require("@/services/otp/mailOtpService/shared/otpExtractor");
const { getMailBackupById } = require("@/services/otp/mailOtpService/repository/mailBackupRepo");
const {
  fetchOtpFromEmail,
  fetchOtpFromAdobeEmail,
  hasOtpConfig,
} = require("@/services/otp/mailOtpService/handlers/fetchOtpFromEmail");
const { getInboxCount } = require("@/services/otp/mailOtpService/handlers/getInboxCount");
const { getConnectionDebug } = require("@/services/otp/mailOtpService/handlers/getConnectionDebug");
const { listRecentEmails } = require("@/services/otp/mailOtpService/handlers/listRecentEmails");
const { fetchLastAdobeEmailRaw } = require("@/services/otp/mailOtpService/handlers/fetchLastAdobeEmailRaw");
const { fetchRecentWithEnvLogin } = require("@/services/otp/mailOtpService/handlers/fetchRecentWithEnvLogin");

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
