/**
 * Test luồng: đăng nhập Adobe (bằng cookies) → Admin Console Users → scrape danh sách user.
 *
 * Chạy từ thư mục backend:
 *   node scripts/test-manage-team.js
 *
 * Hoặc chỉ định file cookies:
 *   COOKIES_FILE=cookies/adobe_account_1.json node scripts/test-manage-team.js
 */
require("dotenv").config();
const path = require("path");

const COOKIES_FILE = process.env.COOKIES_FILE || path.join("cookies", "adobe_account_1.json");

async function main() {
  console.log("========== TEST MANAGE-TEAM (Adobe) ==========\n");
  console.log("[test] Cookies file:", COOKIES_FILE);
  console.log("[test] PUPPETEER_HEADLESS:", process.env.PUPPETEER_HEADLESS || "(false - mở browser)\n");

  const adobeCheckService = require("../src/services/adobeCheckService");

  try {
    console.log("[test] Gọi getAdobeUserToken với cookies...");
    await adobeCheckService.getAdobeUserToken("", "", { cookiesFile: COOKIES_FILE });
    console.log("[test] Không mong đợi chạy tới đây (success throw error với scrapedData)");
  } catch (err) {
    if (err.scrapedData) {
      const sd = err.scrapedData;
      console.log("\n[test] ✅ Đăng nhập thành công (throw expected).");
      console.log("[test] orgName:", sd.orgName ?? "(null)");
      console.log("[test] profileName:", sd.profileName ?? "(null)");
      console.log("[test] userCount:", sd.userCount);
      console.log("[test] licenseStatus:", sd.licenseStatus);
      if (sd.manageTeamMembers && Array.isArray(sd.manageTeamMembers)) {
        console.log("[test] manageTeamMembers count:", sd.manageTeamMembers.length);
        console.log("[test] manageTeamMembers (raw):", JSON.stringify(sd.manageTeamMembers, null, 2));
      } else {
        console.log("[test] manageTeamMembers: (không có hoặc không phải mảng)");
      }
      if (sd.adminConsoleUsers && sd.adminConsoleUsers.length > 0) {
        console.log("[test] adminConsoleUsers count (fallback):", sd.adminConsoleUsers.length);
      }
      console.log("\n========== KẾT THÚC TEST ==========");
      process.exit(0);
    }
    console.error("\n[test] ❌ Lỗi:", err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("[test] Unhandled:", e);
  process.exit(1);
});
