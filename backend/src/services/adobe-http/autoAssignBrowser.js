/**
 * Playwright: tự động tạo hoặc lấy URL auto-assign (Admin Console).
 * Logic B14 nằm trong adobe-renew-v2/autoAssignFlow.js. File này chỉ launch browser cho flow standalone.
 *
 * Flow standalone: Mở browser → cookies → navigate Admin Console → nếu login thì form login (V2) → B14 (V2) → đóng.
 */

const { chromium } = require("playwright");
const logger = require("../../utils/logger");
const { getPlaywrightProxyOptions } = require("./proxyConfig");
const adobeRenewV2 = require("../adobe-renew-v2");

const ADOBE_ENTRY_URL = "https://adminconsole.adobe.com/";

/**
 * Standalone: launch browser, navigate tới Admin Console, nếu cần thì form login (V2), rồi gọi B14 (V2).
 * @param {string} orgId
 * @param {string} email
 * @param {string} password
 * @param {object} options - { savedCookies, mailBackupId }
 * @returns {Promise<{ url: string|null, savedCookies: object[]|null }>}
 */
async function getOrCreateAutoAssignUrl(orgId, email, password, options = {}) {
  if (!orgId || !email || !password) {
    logger.warn("[auto-assign-pw] Thiếu orgId/email/password");
    return { url: null, savedCookies: null };
  }

  const savedCookies = options.savedCookies || [];
  const mailBackupId = options.mailBackupId || null;

  const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";
  const proxyOptions = getPlaywrightProxyOptions();
  logger.info("[auto-assign-pw] Khởi động Playwright (headless=%s)...", headless);

  const launchOptions = {
    headless,
    slowMo: headless ? 0 : 80,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  };
  if (proxyOptions) launchOptions.proxy = proxyOptions;
  const browser = await chromium.launch(launchOptions);

  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});

    const pwCookies = adobeRenewV2.toPwCookies(savedCookies);
    if (pwCookies.length > 0) {
      await context.addCookies(pwCookies);
      logger.info("[auto-assign-pw] Imported %d cookies từ DB", pwCookies.length);
    }

    const page = await context.newPage();
    logger.info("[auto-assign-pw] B1: Navigate tới Admin Console...");
    await page.goto(ADOBE_ENTRY_URL, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(3000);

    if (page.url().includes("auth.services") || page.url().includes("adobelogin.com")) {
      logger.info("[auto-assign-pw] Cookies hết hạn → form login (V2)...");
      const loginOk = await adobeRenewV2.doFormLoginOnAuthPage(page, email, password, mailBackupId);
      if (!loginOk) {
        logger.warn("[auto-assign-pw] Form login thất bại");
        return { url: null, savedCookies: null };
      }
    }

    return await adobeRenewV2.getOrCreateAutoAssignUrlWithPage(page, orgId, email, password, { mailBackupId });
  } catch (err) {
    logger.error("[auto-assign-pw] Lỗi: %s", err.message);
    return { url: null, savedCookies: null };
  } finally {
    await browser.close().catch(() => {});
  }
}

module.exports = { getOrCreateAutoAssignUrl };
