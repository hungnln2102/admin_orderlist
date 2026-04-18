/**
 * Add users + assign product via API (V2).
 * Luồng: B1–B9 (onlyLogin) → /users → create user (abpapi) + assign product (PATCH) → B15 → API snapshot.
 */

const logger = require("../../utils/logger");
const { runCheckFlow } = require("./runCheckFlow");
const { getPlaywrightProxyOptions } = require("./shared/proxyConfig");
const { launchSessionFromProfile } = require("./shared/profileSession");
const {
  runGotoUsersFlow,
  runCheckAdminProductFlow,
  runRemoveAdminProductFlow,
  runAddUsersFlow,
  runUsersSnapshotFlow,
  runPersistUsersSessionFlow,
} = require("./flows/users");

const ADMIN_CONSOLE_URL = "https://adminconsole.adobe.com/";

async function addUsersWithProductV2(adminEmail, password, userEmails, options = {}) {
  const savedCookies = options.savedCookies || [];
  const mailBackupId = options.mailBackupId || null;
  const otpSource = options.otpSource || "imap";
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

  let context = null;
  let page = null;
  try {
    const prof = await launchSessionFromProfile({
      adminEmail,
      headless,
      proxyOptions,
    });
    context = prof.context;
    page = prof.page;
  } catch (profileErr) {
    logger.warn(
      "[adobe-v2] addUsersWithProductV2: persistent profile unavailable, fallback to ephemeral context: %s",
      profileErr.message
    );
    const { chromium } = require("playwright");
    const browser = await chromium.launch(launchOptions);
    context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    context.__adobeEphemeralBrowser = browser;
  }
  const sharedSession = { context, page };

  try {
    logger.info("[adobe-v2] addUsersWithProductV2: login (B1–B9 onlyLogin) → add=%d", emails.length);

    const loginResult = await runCheckFlow(adminEmail, password, {
      savedCookies,
      mailBackupId,
      otpSource,
      sharedSession,
      onlyLogin: true,
    });
    if (!loginResult.success) {
      return { success: false, error: loginResult.error || "Login fail", savedCookies: null, snapshot: null };
    }

    const page = sharedSession.page;

    if (!page.url().includes("@AdobeOrg")) {
      await page.goto(ADMIN_CONSOLE_URL, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      await page.waitForURL(/@AdobeOrg/, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    await runGotoUsersFlow(page);

    const addResult = await runAddUsersFlow(page, emails);
    if (!addResult.success) {
      const sessionResult = await runPersistUsersSessionFlow(context).catch(() => ({
        savedCookies: null,
      }));
      return {
        success: false,
        error: "Add user API fail",
        savedCookies: sessionResult.savedCookies,
        snapshot: null,
      };
    }

    // Product đã được assign ngay trong runAddUsersFlow (create user + PATCH add product).

    // Remove product from admin if needed (B15)
    try {
      const checkAdminProduct = await runCheckAdminProductFlow(page, adminEmail);
      const url = page.url();
      const orgId =
        (url.match(/\/([A-Fa-f0-9]{20,})@AdobeOrg/) || [])[1] ||
        options.orgId ||
        null;
      if (checkAdminProduct.hasAdminProduct && orgId) {
        await runRemoveAdminProductFlow(page, adminEmail, { orgId });
      }
    } catch (e) {
      logger.warn("[adobe-v2] B15 remove admin product error: %s", e.message);
    }

    await runGotoUsersFlow(page);
    const snapshotResult = await runUsersSnapshotFlow(page, { adminEmail });
    const sessionResult = await runPersistUsersSessionFlow(context);

    return {
      success: true,
      addResult: {
        success: true,
        added: addResult.done || emails,
        failed: (addResult.failed || []).map((f) => f.email),
      },
      assignResult: { success: true },
      manageTeamMembers: snapshotResult.manageTeamMembers,
      userCount: snapshotResult.userCount,
      licenseStatus: "unknown",
      savedCookies: sessionResult.savedCookies,
    };
  } catch (err) {
    logger.error("[adobe-v2] addUsersWithProductV2 error: %s", err.message);
    return { success: false, error: err.message, savedCookies: null, snapshot: null };
  } finally {
    if (context) {
      const ephemeralBrowser = context.__adobeEphemeralBrowser || null;
      await context.close().catch(() => {});
      if (ephemeralBrowser) {
        await ephemeralBrowser.close().catch(() => {});
      }
    }
  }
}

module.exports = { addUsersWithProductV2 };

