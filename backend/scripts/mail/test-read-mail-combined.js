/**
 * Test gộp: đăng nhập IMAP bằng env MAILTEST + APPPASSWORD, lấy thư từ INBOX;
 * nếu truyền mail_backup_id thì lấy email từ bảng mail_backup để lọc ra thư (to/from đúng địa chỉ đó), lấy mail mới nhất.
 *
 * Chạy từ thư mục backend:
 *   node scripts/test-read-mail-combined.js
 *   node scripts/test-read-mail-combined.js 1
 *
 * - Không tham số: đếm INBOX + liệt kê thư gần đây (dùng env login).
 * - Có mail_backup_id (vd. 1): env login + lọc theo email trong mail_backup, in thư mới nhất.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");

const mailBackupIdArg = process.argv[2] || process.env.MAIL_BACKUP_ID;
const mailBackupId = mailBackupIdArg != null ? parseInt(mailBackupIdArg, 10) : null;
const limit = 25;

async function main() {
  console.log("=== Test gộp: Login env (MAILTEST) + filter mail_backup ===\n");

  const user = process.env.MAILTEST || process.env.ADOBE_OTP_IMAP_USER;
  const pass = process.env.APPPASSWORD || process.env["2FA"] || process.env.ADOBE_OTP_IMAP_PASSWORD;
  if (!user || !pass) {
    console.error("Cần set MAILTEST và APPPASSWORD (hoặc ADOBE_OTP_IMAP_*) trong .env");
    process.exit(1);
  }
  console.log("Login: env MAILTEST =", user ? `${String(user).slice(0, 8)}***` : "—");
  if (mailBackupId != null && Number.isFinite(mailBackupId)) {
    console.log("Filter: mail_backup_id =", mailBackupId, "(chỉ thư to/from địa chỉ trong bảng)");
  } else {
    console.log("Filter: (không) — hiển thị mọi thư gần đây");
  }
  console.log("");

  const mailOtpService = require("../src/services/mailOtpService");
  const { count, emails, newest } = await mailOtpService.fetchRecentWithEnvLogin({
    mailBackupIdForFilter: Number.isFinite(mailBackupId) ? mailBackupId : null,
    limit,
  });

  console.log("INBOX — số thư (gần đúng):", count);
  console.log("Số thư lấy được (sau filter nếu có):", emails.length);
  console.log("");

  if (emails.length > 0) {
    console.log("Danh sách (mới nhất trước):");
    emails.slice(0, 10).forEach((m, i) => {
      console.log(`${i + 1}. From: ${m.from}`);
      console.log(`   To: ${(m.to || "").slice(0, 60)}`);
      console.log(`   Subject: ${m.subject}`);
      console.log(`   Date: ${m.date}`);
      console.log("");
    });
    if (emails.length > 10) console.log(`... và ${emails.length - 10} thư khác.\n`);

    if (newest) {
      console.log("--- Mail mới nhất ---");
      console.log("From:", newest.from);
      console.log("To:", newest.to);
      console.log("Subject:", newest.subject);
      console.log("Date:", newest.date);
      const isAdobe = /adobe|message@adobe/i.test(newest.from || "");
      if (isAdobe && newest.html) {
        const outPath = path.join(__dirname, "..", "last-adobe-mail.html");
        fs.writeFileSync(outPath, newest.html, "utf8");
        console.log("\nĐã ghi HTML ra:", outPath);
        const code = mailOtpService.extractOtpFromText((newest.text || "") + " " + (newest.html || ""));
        if (code) console.log("Mã OTP trích được:", code);
      }
    }
  } else {
    console.log("Không có thư nào (hoặc không có thư trùng filter).");
  }

  console.log("\nXong.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
