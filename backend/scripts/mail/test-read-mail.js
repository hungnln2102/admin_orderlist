/**
 * Test đọc mail qua mailOtpService — chỉ dùng dữ liệu từ bảng mail_backup (không dùng env).
 *
 * Chạy từ thư mục backend:
 *   node scripts/test-read-mail.js <mail_backup_id>
 *   node scripts/test-read-mail.js 1
 *
 * Hoặc set trong .env: MAIL_BACKUP_ID=1 rồi chạy:
 *   node scripts/test-read-mail.js
 *
 * Cấu hình mailbox: thêm bản ghi trong identity.mail_backup (email, app_password, provider, is_active = true).
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mailBackupIdArg = process.argv[2] || process.env.MAIL_BACKUP_ID;
const mailBackupId = mailBackupIdArg != null ? parseInt(mailBackupIdArg, 10) : null;

async function main() {
  console.log("=== Test đọc mail (chỉ dùng bảng mail_backup) ===\n");

  if (!Number.isFinite(mailBackupId) || mailBackupId < 1) {
    console.error("Cần truyền mail_backup_id (id bản ghi trong bảng identity.mail_backup).");
    console.error("  node scripts/test-read-mail.js <id>");
    console.error("  hoặc set MAIL_BACKUP_ID=<id> trong .env rồi chạy: node scripts/test-read-mail.js");
    process.exit(1);
  }

  const mailOtpService = require("../src/services/mailOtpService");
  const backup = await mailOtpService.getMailBackupById(mailBackupId);
  if (!backup) {
    console.error("Không tìm thấy mail_backup id =", mailBackupId);
    console.error("Kiểm tra bảng identity.mail_backup có bản ghi và is_active = true.");
    process.exit(1);
  }
  console.log("mail_backup_id:", mailBackupId);
  console.log("email:", backup.email ? `${backup.email.slice(0, 6)}***@${(backup.email.split("@")[1] || "?")}` : "—");
  console.log("provider:", backup.provider || "gmail");
  const maxAge = process.env.ADOBE_OTP_MAIL_MAX_AGE_MINUTES;
  if (maxAge && maxAge !== "0") console.log("ADOBE_OTP_MAIL_MAX_AGE_MINUTES:", maxAge, "(chỉ lấy mail trong N phút gần đây; set =0 để tắt)");
  console.log("\nĐang kết nối IMAP và tìm mail Adobe (OTP)...\n");

  const code = await mailOtpService.fetchOtpFromEmail(mailBackupId, {
    useEnvFallback: false,
    senderFilter: "adobe",
    debugToConsole: true,
  });
  if (code) {
    console.log("Mã OTP (từ mail Adobe):", code);
  } else {
    console.log("Không tìm thấy mã OTP trong mail Adobe gần đây (mặc định 60 phút, xem ADOBE_OTP_MAIL_MINUTES).");
    console.log("Gợi ý: 1) Cuộn lên xem từng dòng [OTP DEBUG] (From, Subject, lý do bỏ qua). 2) Thử set ADOBE_OTP_MAIL_MAX_AGE_MINUTES=0 để bỏ lọc thời gian.");
  }
  console.log("\nXong.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
