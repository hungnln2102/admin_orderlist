/**
 * Test: lấy toàn bộ nội dung mail Adobe gần nhất (HTML + text) và ghi ra file để debug.
 * Chỉ lấy mail từ message@adobe.com / @adobe.com.
 *
 * Chạy từ thư mục backend:
 *   node scripts/test-read-mail-raw.js <mail_backup_id>
 *   node scripts/test-read-mail-raw.js 1
 *
 * Kết quả:
 *   - last-adobe-mail.html  (nội dung HTML)
 *   - last-adobe-mail.txt   (nội dung plain text)
 *   (ghi vào thư mục backend)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const listOnly = process.argv.includes("--list") || process.argv.includes("-l");
const debugOnly = process.argv.includes("--debug") || process.argv.includes("-d");
const countOnly = process.argv.includes("--count") || process.argv.includes("-c");
const mailBackupIdArg = args[0] || process.env.MAIL_BACKUP_ID;
const mailBackupId = mailBackupIdArg != null ? parseInt(mailBackupIdArg, 10) : null;
const minutesArg = args[1];
const minutesBack = minutesArg != null ? parseInt(minutesArg, 10) : 60;

async function main() {
  console.log("=== Test lấy toàn bộ nội dung mail Adobe (HTML) ===\n");

  if (!Number.isFinite(mailBackupId) || mailBackupId < 1) {
    console.error("Cần truyền mail_backup_id.");
    console.error("  node scripts/test-read-mail-raw.js <id> [phút_lùi]");
    console.error("  Ví dụ: node scripts/test-read-mail-raw.js 1 60");
    process.exit(1);
  }

  const mailOtpService = require("../src/services/mailOtpService");
  const backup = await mailOtpService.getMailBackupById(mailBackupId);
  if (!backup) {
    console.error("Không tìm thấy mail_backup id =", mailBackupId);
    process.exit(1);
  }

  console.log("mail_backup_id:", mailBackupId);
  console.log("email:", backup.email ? `${backup.email.slice(0, 6)}***@${(backup.email.split("@")[1] || "?")}` : "—");
  console.log("Khoảng thời gian:", minutesBack, "phút gần nhất.\n");

  if (countOnly) {
    console.log("Chế độ --count: đếm số thư INBOX (cùng cách test-imap-login, dùng mail_backup):\n");
    const count = await mailOtpService.getInboxCount(mailBackupId);
    if (count === null) {
      console.log("Lỗi: không lấy được số thư (kiểm tra mail_backup id và kết nối).");
      process.exit(1);
    }
    console.log("INBOX — số thư:", count);
    console.log("\nXong.");
    return;
  }

  if (debugOnly) {
    console.log("Chế độ --debug: kiểm tra kết nối IMAP và kết quả search:\n");
    const debug = await mailOtpService.getConnectionDebug(mailBackupId);
    console.log("Kết quả SEARCH ALL:");
    console.log("  searchAllType:", debug.searchAllType);
    console.log("  searchAllLength:", debug.searchAllLength);
    console.log("  uidListLength (sau toUidList):", debug.uidListLength);
    console.log("  mailbox.exists:", debug.mailboxExists);
    if (debug.error) console.log("  error:", debug.error);
    console.log("");
    if (debug.mailboxExists === 0 && !debug.error) {
      console.log("→ INBOX có 0 thư (theo server). Kiểm tra: đúng tài khoản Gmail chưa? IMAP đã bật chưa?");
    } else if (debug.uidListLength === 0 && debug.mailboxExists > 0) {
      console.log("→ Server báo có", debug.mailboxExists, "thư nhưng search trả về 0. Có thể do định dạng trả về của ImapFlow.");
    } else if (debug.uidListLength > 0) {
      console.log("→ Có UID list, script list/raw sẽ dùng được.");
    }
    console.log("\nXong.");
    return;
  }

  if (listOnly) {
    console.log("Chế độ --list: liệt kê mail gần đây (From, Subject, Date):\n");
    const list = await mailOtpService.listRecentEmails(mailBackupId, { minutesBack, limit: 25 });
    if (list.length === 0) {
      console.log("Không có mail nào trong INBOX trong khoảng thời gian trên.");
      console.log("Chạy với --debug để xem chi tiết: node scripts/test-read-mail-raw.js 1 --debug");
      process.exit(1);
    }
    list.forEach((m, i) => {
      console.log(`${i + 1}. From: ${m.from}`);
      console.log(`   Subject: ${m.subject}`);
      console.log(`   Date: ${m.date}`);
      console.log("");
    });
    console.log("Xong. Chạy không có --list để tải nội dung HTML mail Adobe.");
    return;
  }

  console.log("Tìm mail từ Adobe...\n");
  const raw = await mailOtpService.fetchLastAdobeEmailRaw(mailBackupId, { minutesBack });
  if (!raw) {
    console.log("Không tìm thấy mail nào từ Adobe trong khoảng thời gian trên.");
    console.log("Thử: node scripts/test-read-mail-raw.js 1 --list  (để xem danh sách mail IMAP trả về)");
    process.exit(1);
  }

  console.log("Đã tìm thấy mail:");
  console.log("  From:", raw.from);
  console.log("  Subject:", raw.subject);
  console.log("  Date:", raw.date);
  console.log("  HTML length:", (raw.html || "").length, "chars");
  console.log("  Text length:", (raw.text || "").length, "chars");

  const outDir = path.join(__dirname, "..");
  const htmlPath = path.join(outDir, "last-adobe-mail.html");
  const txtPath = path.join(outDir, "last-adobe-mail.txt");

  fs.writeFileSync(htmlPath, raw.html || "", "utf8");
  fs.writeFileSync(txtPath, raw.text || "", "utf8");

  console.log("\nĐã ghi:");
  console.log("  HTML:", htmlPath);
  console.log("  Text:", txtPath);
  console.log("\nXong. Mở file HTML bằng trình duyệt để xem nội dung mail.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
