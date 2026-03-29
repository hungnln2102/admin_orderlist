/**
 * Test đăng nhập IMAP Gmail với 2 biến:
 *   MAILTEST     = username (email)
 *   APPPASSWORD  = App Password (mật khẩu ứng dụng, 16 ký tự)
 *
 * Chạy từ thư mục backend:
 *   node scripts/test-imap-login.js
 *
 * Trong .env:
 *   MAILTEST=otp.system.test@gmail.com
 *   APPPASSWORD=xxxx xxxx xxxx xxxx
 */
require("dotenv").config();
const { ImapFlow } = require("imapflow");

const MAILTEST = process.env.MAILTEST || process.env.ADOBE_OTP_IMAP_USER;
const APP_PASSWORD = process.env.APPPASSWORD || process.env["2FA"] || process.env.ADOBE_OTP_IMAP_PASSWORD;

async function main() {
  console.log("=== Test login IMAP (Gmail) ===\n");
  console.log("MAILTEST (username):", MAILTEST ? `${MAILTEST.slice(0, 6)}***@${MAILTEST.split("@")[1] || "?"}` : "(chưa set)");
  console.log("APPPASSWORD:", APP_PASSWORD ? `${APP_PASSWORD.slice(0, 4)}****` : "(chưa set)");

  if (!MAILTEST || !APP_PASSWORD) {
    console.error("\nLỗi: Cần set MAILTEST và APPPASSWORD trong .env");
    console.error("Ví dụ:");
    console.error("  MAILTEST=otp.system.test@gmail.com");
    console.error("  APPPASSWORD=xxxx xxxx xxxx xxxx");
    process.exit(1);
  }

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: MAILTEST,
      pass: APP_PASSWORD,
    },
    logger: false,
  });

  try {
    await client.connect();
    console.log("\n✓ Kết nối IMAP thành công.");

    const lock = await client.getMailboxLock("INBOX");
    try {
      const info = await client.status("INBOX", { messages: true });
      console.log("  INBOX — số thư (gần đúng):", info.messages ?? "—");
    } finally {
      lock.release();
    }

    await client.logout();
    console.log("✓ Đăng xuất OK. Hệ thống sẵn sàng dùng IMAP (App Password).\n");
  } catch (err) {
    console.error("\n✗ Lỗi:", err.message);
    if (err.response) console.error("  IMAP response:", err.response);
    if (err.code) console.error("  Code:", err.code);
    if (/Invalid credentials|Authentication failed|Command failed|LOGIN failed/i.test(err.message)) {
      console.error("\nGợi ý: Dùng App Password (mật khẩu ứng dụng), không dùng mật khẩu đăng nhập thường.");
      console.error("Tạo App Password: Tài khoản Google → Bảo mật → Xác minh 2 bước → Mật khẩu ứng dụng.");
    }
    process.exit(1);
  }
}

main();
