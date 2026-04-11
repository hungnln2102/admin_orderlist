/**
 * Xóa user trong luồng V2.
 * Luồng: B1–B9 (login) → vào /users xóa user → chạy lại check users (scrape bảng) → kết thúc.
 */

const { chromium } = require("playwright");
const logger = require("../../utils/logger");
const { runCheckFlow } = require("./runCheckFlow");
const { getPlaywrightProxyOptions } = require("./shared/proxyConfig");
const {
  runGotoUsersFlow,
  runDeleteUsersFlow,
  runUsersSnapshotFlow,
  runPersistUsersSessionFlow,
} = require("./flows/users");

const ADMIN_CONSOLE_URL = "https://adminconsole.adobe.com/";

/**
 * Xóa danh sách user qua V2: B1–B9 (chỉ login) rồi vào /users xóa, đọc snapshot. Không check org_name/B10–B13.
 * @param {string} email - Admin email
 * @param {string} password - Mật khẩu
 * @param {string[]} userEmails - Danh sách email cần xóa
 * @param {{ savedCookies?: any[], mailBackupId?: number, otpSource?: string }} options
 * @returns {{ deleted: string[], failed: string[], snapshot: object|null, savedCookies: object|null, error?: string }}
 */
async function deleteUsersV2(email, password, userEmails, options = {}) {
  const savedCookies = options.savedCookies || [];
  const mailBackupId = options.mailBackupId || null;
  const otpSource = options.otpSource || "imap";
  const userList = Array.isArray(userEmails) ? userEmails.filter((e) => (e || "").trim()) : [];

  if (userList.length === 0) {
    return { deleted: [], failed: [], snapshot: null, savedCookies: null };
  }

  const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";
  const proxyOptions = getPlaywrightProxyOptions();
  const launchOptions = {
    headless,
    slowMo: headless ? 0 : 80,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  };
  if (proxyOptions) launchOptions.proxy = proxyOptions;

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
  });
  const sharedSession = { context, page: await context.newPage() };

  try {
    logger.info("[adobe-v2] deleteUsersV2: B1–B9 (chỉ login) → xóa %d user...", userList.length);

    const loginResult = await runCheckFlow(email, password, {
      savedCookies,
      mailBackupId,
      otpSource,
      sharedSession,
      onlyLogin: true,
    });

    if (!loginResult.success) {
      logger.warn("[adobe-v2] deleteUsersV2: login (B1–B9) fail: %s", loginResult.error);
      return {
        deleted: [],
        failed: userList,
        snapshot: null,
        savedCookies: null,
        error: loginResult.error,
      };
    }

    const page = sharedSession.page;

    if (!page.url().includes("@AdobeOrg")) {
      await page.goto(ADMIN_CONSOLE_URL, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      await page.waitForURL(/@AdobeOrg/, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    await runGotoUsersFlow(page);
    const deleteResult = await runDeleteUsersFlow(page, userList, {
      stopOnError: false,
    });

    const deleted = deleteResult.done || [];
    const failed = (deleteResult.failed || []).map((f) => f.email);

    await runGotoUsersFlow(page);
    const snapshotResult = await runUsersSnapshotFlow(page, { adminEmail: email });
    logger.info(
      "[adobe-v2] Check users (scrape bảng) xong → kết thúc. users=%d",
      (snapshotResult.users || []).length
    );
    const snapshot = {
      orgName: null,
      licenseStatus: "unknown",
      products: [],
      manageTeamMembers: snapshotResult.manageTeamMembers,
      adminConsoleUsers: snapshotResult.users,
    };
    const sessionResult = await runPersistUsersSessionFlow(context);

    logger.info("[adobe-v2] deleteUsersV2 done: deleted=%d, failed=%d", deleted.length, failed.length);
    return {
      deleted,
      failed,
      snapshot,
      savedCookies: sessionResult.savedCookies,
    };
  } catch (err) {
    logger.error("[adobe-v2] deleteUsersV2 error: %s", err.message);
    return {
      deleted: [],
      failed: userList,
      snapshot: null,
      savedCookies: null,
      error: err.message,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

module.exports = { deleteUsersV2 };
