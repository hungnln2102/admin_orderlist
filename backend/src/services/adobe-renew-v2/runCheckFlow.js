/**
 * Adobe Renew V2 — Điều phối luồng B1–B13.
 * B1 tại đây; B2–B9 giao loginFlow.js; B10–B13 giao checkInfoFlow.js.
 */

const { chromium } = require("playwright");
const logger = require("../../utils/logger");
const { getPlaywrightProxyOptions } = require("../adobe-http/proxyConfig");
const { LOGIN_PAGE_URL, ADMIN_CONSOLE_BASE } = require("../adobe-http/constants");
const { runLoginFlow, isOnAdobeSite } = require("./loginFlow");
const { runB10ToB13 } = require("./checkInfoFlow");

// Tránh hit www.adobe.com (hay lỗi ERR_HTTP2_PROTOCOL_ERROR trên VPS/headless).
// Admin Console entry ổn định hơn và vẫn dẫn về auth.services khi cần login.
const ADOBE_ENTRY = ADMIN_CONSOLE_BASE || "https://adminconsole.adobe.com/";

/** Cookie session khi export được gán expiry mặc định để tái sử dụng 2–3 ngày (tránh chết sau 1h). */
const DEFAULT_COOKIE_EXPIRY_DAYS = 3;

/** Cookie format: DB/API → Playwright. Cookie không có expirationDate (lưu cũ) được gán expiry 3 ngày khi inject. */
function toPwCookies(cookies) {
  const now = Math.floor(Date.now() / 1000);
  const defaultExpiry = now + DEFAULT_COOKIE_EXPIRY_DAYS * 24 * 3600;
  return (cookies || [])
    .filter((c) => c.name && c.domain)
    .filter((c) => {
      const exp = c.expirationDate ?? defaultExpiry;
      return exp > now;
    })
    .map((c) => {
      const expires = c.expirationDate && c.expirationDate > 0 ? c.expirationDate : defaultExpiry;
      return {
        name: c.name,
        value: c.value || "",
        domain: c.domain,
        path: c.path || "/",
        expires,
        httpOnly: !!c.httpOnly,
        secure: c.secure !== false,
        sameSite: (c.sameSite || "Lax").toString() === "None" ? "None" : "Lax",
      };
    });
}

/** Playwright → DB/API. Cookie session (expires <= 0) được gán expiry mặc định 3 ngày để tái dùng. */
function fromPwCookies(cookies) {
  const now = Math.floor(Date.now() / 1000);
  const defaultExpiry = now + DEFAULT_COOKIE_EXPIRY_DAYS * 24 * 3600;
  return (cookies || []).map((c) => {
    const isSession = !c.expires || c.expires <= 0;
    const expirationDate = c.expires > 0 ? c.expires : defaultExpiry;
    return {
      name: c.name,
      value: c.value || "",
      domain: c.domain,
      path: c.path || "/",
      httpOnly: !!c.httpOnly,
      secure: !!c.secure,
      sameSite: c.sameSite || "Lax",
      expirationDate,
      session: isSession,
    };
  });
}

/**
 * Chạy toàn bộ luồng B1–B13.
 * Nếu options.sharedSession = { context, page } thì dùng browser có sẵn (B14 có thể dùng tiếp), không đóng browser.
 * @param {string} email - Email đăng nhập Adobe
 * @param {string} password - Mật khẩu
 * @param {{ savedCookies?: any[], mailBackupId?: number, sharedSession?: { context: import('playwright').BrowserContext, page: import('playwright').Page }, existingOrgName?: string, onlyLogin?: boolean }} options - existingOrgName: bỏ qua B10–B11; onlyLogin: chỉ B1–B9 (login), không chạy B10–B13 (check org/products/users).
 * @returns {Promise<{ success: boolean, error?: string, org_name?: string, license_status?: string, products?: any[], users?: any[], cookies?: any[] }>}
 */
async function runCheckFlow(email, password, options = {}) {
  logger.info("[adobe-v2] runCheckFlow BẮT ĐẦU (cookie expiry=%d ngày) — adobe-renew-v2", DEFAULT_COOKIE_EXPIRY_DAYS);
  const { savedCookies = [], mailBackupId = null, sharedSession = null, existingOrgName = null, onlyLogin = false } = options;
  let browser = null;
  let context;
  let page;

  if (sharedSession && sharedSession.context && sharedSession.page) {
    context = sharedSession.context;
    page = sharedSession.page;
    logger.info("[adobe-v2] B14: Dùng shared session (không đóng browser)");
  } else {
    const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";
    const proxyOptions = getPlaywrightProxyOptions();
    if (proxyOptions) logger.info("[adobe-v2] Proxy: %s", proxyOptions.server);
    const launchOptions = {
      headless,
      slowMo: headless ? 0 : 80,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        // Giảm lỗi mạng kiểu ERR_HTTP2_PROTOCOL_ERROR/QUIC trên một số môi trường/proxy
        "--disable-quic",
      ],
    };
    if (proxyOptions) launchOptions.proxy = proxyOptions;
    browser = await chromium.launch(launchOptions);
    context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
  }

  try {

    if (savedCookies.length > 0) {
      const pwCookies = toPwCookies(savedCookies);
      if (pwCookies.length > 0) await context.addCookies(pwCookies);
    }

    // ─── B1: Đi thẳng vào Admin Console entry ───
    // Adobe tự redirect adminconsole.adobe.com → auth.services.adobe.com khi chưa login.
    // Không cần fallback thủ công — Adobe handle redirect natively.
    logger.info("[adobe-v2] B1: goto ADMIN_CONSOLE entry");
    await page
      .goto(ADOBE_ENTRY, { waitUntil: "domcontentloaded", timeout: 45000 })
      .catch((e) => logger.warn("[adobe-v2] B1 goto error: %s", e.message));
    // Sau khi goto, Adobe có thể redirect sang auth mất vài giây.
    // Đợi tối đa ~5s để lấy đúng "trang hiện tại" trước khi quyết định bỏ qua login.
    await page.waitForTimeout(5000);
    await page.locator('button[aria-label="Close"], button[aria-label="close"], .dialog-close').first().click({ timeout: 3000 }).then(() => true).catch(() => false);

    // ─── B2: Session check — tránh false positive ───
    // Adobe có thể show adminconsole shell trước rồi mới redirect sang auth.
    // Vì vậy không chỉ dựa vào URL; cần dựa thêm vào việc thấy màn login hay thấy org-switch.
    const urlAfterB1 = page.url();

    const isLoginUiVisible = async () => {
      const emailInputVisible = await page
        .locator('input[name="username"], input[type="email"], input[name="email"]')
        .first()
        .isVisible()
        .catch(() => false);

      const passwordInputVisible = await page
        .locator('input[type="password"], input#password')
        .first()
        .isVisible()
        .catch(() => false);

      return emailInputVisible || passwordInputVisible;
    };

    const isOrgSwitchVisible = async () => {
      return await page
        .locator('button[data-testid="org-switch-button"]')
        .first()
        .isVisible()
        .catch(() => false);
    };

    // Không dùng URL làm tiêu chí duy nhất.
    // Adobe có thể show shell adminconsole trước, rồi mới chuyển sang auth,
    // nên nếu check quá sớm sẽ bị false positive.
    const deadline = Date.now() + 5000;
    let sessionValid = false;

    while (Date.now() < deadline) {
      const urlNow = page.url() || "";
      const onAuthUrl =
        urlNow.includes("auth.services") ||
        urlNow.includes("adobelogin.com") ||
        urlNow.includes("auth.");

      if (onAuthUrl) break;

      // Nếu đang thấy form login thì chắc chắn chưa login thật.
      if (await isLoginUiVisible()) break;

      // Nếu thấy org switch thì coi như đã vào admin console (logged-in).
      if (await isOrgSwitchVisible()) {
        sessionValid = true;
        break;
      }

      await page.waitForTimeout(250);
    }

    logger.info(
      "[adobe-v2] B2: url=%s → session %s",
      urlAfterB1.slice(0, 90),
      sessionValid ? "VALID (bỏ qua login)" : "EXPIRED (cần login)"
    );

    if (sessionValid) {
      if (onlyLogin) {
        const rawCookies = await context.cookies();
        const cookies = fromPwCookies(rawCookies);
        logger.info("[adobe-v2] onlyLogin: session còn hiệu lực, dừng trước B10–B13");
        return { success: true, cookies };
      }
      const result = await runB10ToB13(page, { existingOrgName });
      const rawCookies = await context.cookies();
      const cookies = fromPwCookies(rawCookies);
      logger.info("[adobe-v2] Lưu cookies: %d (expiry %d ngày)", cookies.length, DEFAULT_COOKIE_EXPIRY_DAYS);
      return { success: true, ...result, cookies };
    }

    // Session hết hạn → B3–B9 (loginFlow) rồi B10–B13
    await runLoginFlow(page, { email, password, mailBackupId });
    if (onlyLogin) {
      const rawCookies = await context.cookies();
      const cookies = fromPwCookies(rawCookies);
      logger.info("[adobe-v2] onlyLogin: dừng sau B9 (login xong), không chạy B10–B13");
      return { success: true, cookies };
    }
    const result = await runB10ToB13(page, { existingOrgName });
    const rawCookies = await context.cookies();
    const cookies = fromPwCookies(rawCookies);
    const withExpiry = cookies.filter((c) => c.expirationDate && c.expirationDate > Math.floor(Date.now() / 1000)).length;
    logger.info("[adobe-v2] Lưu cookies: %d (expiry %d ngày, %d có expirationDate)", cookies.length, DEFAULT_COOKIE_EXPIRY_DAYS, withExpiry);
    return { success: true, ...result, cookies };

  } catch (err) {
    logger.error("[adobe-v2] runCheckFlow error: %s", err.message);
    return { success: false, error: err.message };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = {
  runCheckFlow,
  toPwCookies,
  fromPwCookies,
};
