require("module-alias/register");

const { scrapeYunaOtp } = require("@/services/yunaOtpMailScraper");

async function run() {
  console.log("=== Bắt đầu kiểm thử yunaOtpMailScraper ===");

  // 1. Test hotmail/outlook qua adobeyunacode@fatub.org
  console.log("\n1. Test cào mailbox chung (hotmail/outlook) cho michaelmomoreau@outlook.com...");
  try {
    const otp1 = await scrapeYunaOtp("michaelmomoreau@outlook.com");
    console.log("-> Kết quả OTP 1:", otp1);
  } catch (err) {
    console.error("Lỗi Test 1:", err.message);
  }

  // 2. Test tmail.wibucrypto.pro cho email test
  console.log("\n2. Test cào tmail cho test@sluemone.xyz...");
  try {
    const otp2 = await scrapeYunaOtp("test@sluemone.xyz");
    console.log("-> Kết quả OTP 2:", otp2);
  } catch (err) {
    console.error("Lỗi Test 2:", err.message);
  }

  console.log("\n=== Hoàn tất kiểm thử ===");
}

run();
