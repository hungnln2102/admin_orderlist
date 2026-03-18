/**
 * Add users + assign product via Admin Console UI (V2).
 * Luồng: B1–B9 (onlyLogin) → /users → addUsersToOrgViaUI (add + assign inline) → B15 → scrape snapshot.
 * Theo docs Renew_Adobe_V2.md dòng 326: combobox → dropdown → product modal → Lưu.
 */

const { chromium } = require("playwright");
const logger = require("../../utils/logger");
const { runCheckFlow, fromPwCookies } = require("./runCheckFlow");
const { getPlaywrightProxyOptions } = require("../adobe-http/proxyConfig");
const { gotoUsersPageWithCurrentSession, scrapeUsersSnapshot } = require("./userDeleteActions");
const { addUsersToOrgViaUI } = require("./userAddActions");
const { runB15RemoveProductFromAdmin } = require("./removeProductAdminFlow");

const ADMIN_CONSOLE_URL = "https://adminconsole.adobe.com/";

async function addUsersWithProductV2(adminEmail, password, userEmails, options = {}) {
  const savedCookies = options.savedCookies || [];
  const mailBackupId = options.mailBackupId || null;
  const emails = Array.isArray(userEmails) ? userEmails.map((e) => String(e || "").trim().toLowerCase()).filter(Boolean) : [];
  if (emails.length === 0) {
    return { success: false, error: "Danh sách userEmails rỗng", savedCookies: null, snapshot: null };
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
  const page = await context.newPage();

  try {
    logger.info("[adobe-v2] addUsersWithProductV2: login (B1–B9 onlyLogin) → add=%d", emails.length);

    const loginResult = await runCheckFlow(adminEmail, password, {
      savedCookies,
      mailBackupId,
      sharedSession: { context, page },
      onlyLogin: true,
    });
    if (!loginResult.success) {
      return { success: false, error: loginResult.error || "Login fail", savedCookies: null, snapshot: null };
    }

    if (!page.url().includes("@AdobeOrg")) {
      await page.goto(ADMIN_CONSOLE_URL, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      await page.waitForURL(/@AdobeOrg/, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    await gotoUsersPageWithCurrentSession(page);

    const addResult = await addUsersToOrgViaUI(page, emails);
    if (!addResult.success) {
      const cookies = fromPwCookies(await context.cookies());
      return { success: false, error: addResult.error || "Add user UI fail", savedCookies: { cookies }, snapshot: null };
    }

    // Product đã được assign inline trong addUsersToOrgViaUI (theo flow docs dòng 326)
    // Không cần select-users + edit-products riêng nữa

    // Remove product from admin if needed (B15)
    try {
      const url = page.url();
      const orgId = (url.match(/\/([A-Fa-f0-9]{20,})@AdobeOrg/) || [])[1] || options.orgId || null;
      if (orgId) await runB15RemoveProductFromAdmin(page, adminEmail, { orgId });
    } catch (e) {
      logger.warn("[adobe-v2] B15 remove admin product error: %s", e.message);
    }

    await gotoUsersPageWithCurrentSession(page);
    const usersAfter = await scrapeUsersSnapshot(page);

    const adminNorm = (adminEmail || "").toLowerCase().trim();
    const manageTeamMembers = usersAfter
      .filter((u) => (u.email || "").toLowerCase().trim() !== adminNorm)
      .map((u) => ({ name: u.name || "", email: (u.email || "").trim(), product: u.product === true }));

    const cookies = fromPwCookies(await context.cookies());
    return {
      success: true,
      addResult: { success: true, added: addResult.added || emails, failed: addResult.failed || [] },
      assignResult: { success: true },
      manageTeamMembers,
      userCount: manageTeamMembers.length,
      licenseStatus: "unknown",
      savedCookies: { cookies },
    };
  } catch (err) {
    logger.error("[adobe-v2] addUsersWithProductV2 error: %s", err.message);
    return { success: false, error: err.message, savedCookies: null, snapshot: null };
  } finally {
    await browser.close().catch(() => {});
  }
}

module.exports = { addUsersWithProductV2 };

