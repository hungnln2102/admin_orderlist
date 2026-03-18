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

    // ─── B1: Đi thẳng vào Admin Console entry (ổn định hơn www.adobe.com) ───
    // NOTE: headless đi thẳng auth.services dễ bị Adobe chặn/serve flow khác.
    // Vì vậy luôn vào Admin Console entry trước; nếu fail mới fallback auth.services.
    const b1Url = ADOBE_ENTRY;
    logger.info("[adobe-v2] B1: goto ADMIN_CONSOLE entry");
    const b1Ok = await page
      .goto(b1Url, { waitUntil: "domcontentloaded", timeout: 45000 })
      .then(() => true)
      .catch((e) => {
        logger.warn("[adobe-v2] B1 goto error: %s", e.message);
        return false;
      });
    // Fallback: nếu entry fail, luôn fallback qua auth.services
    if (!b1Ok) {
      logger.info("[adobe-v2] B1 fallback: goto LOGIN_PAGE_URL (auth.services)");
      await page.goto(LOGIN_PAGE_URL, { waitUntil: "domcontentloaded", timeout: 45000 }).catch((e) => {
        logger.warn("[adobe-v2] goto LOGIN_PAGE_URL: %s", e.message);
      });
    }
    await page.waitForTimeout(2000);
    await page.locator('button[aria-label="Close"], button[aria-label="close"], .dialog-close').first().click({ timeout: 3000 }).then(() => true).catch(() => false);

    // Chỉ bỏ qua B2 khi không thấy Sign in (trang thực sự đã login). Không dựa mỗi URL www.adobe.com vì trang chủ vẫn hiển thị khi chưa login.
    const urlAfterB1 = page.url();
    const signInVisible = await page.locator("button.profile-comp.secondary-button").first().isVisible().catch(() => false)
      || await page.getByRole("link", { name: /sign\s*in/i }).first().isVisible().catch(() => false)
      || await page.locator('input[type="email"][name="username"], input[placeholder*="mail"], a:has-text("Sign in")').first().isVisible().catch(() => false);
    if (!signInVisible && isOnAdobeSite(urlAfterB1)) {
      logger.info("[adobe-v2] Sau B1 không thấy Sign in (session còn hiệu lực), bỏ qua B2. url=%s", urlAfterB1.slice(0, 90));
      await page.waitForTimeout(2000);
      if (onlyLogin) {
        const rawCookies = await context.cookies();
        const cookies = fromPwCookies(rawCookies);
        logger.info("[adobe-v2] onlyLogin: dừng sau B1 (đã login), không chạy B10–B13");
        return { success: true, cookies };
      }
      const result = await runB10ToB13(page, { existingOrgName });
      const rawCookies = await context.cookies();
      const cookies = fromPwCookies(rawCookies);
      logger.info("[adobe-v2] Lưu cookies: %d (expiry %d ngày)", cookies.length, DEFAULT_COOKIE_EXPIRY_DAYS);
      return { success: true, ...result, cookies };
    }
    if (signInVisible) {
      logger.info("[adobe-v2] Sau B1 thấy Sign in / form login → chạy B2–B9. url=%s", urlAfterB1.slice(0, 90));
    }

    // Chưa đăng nhập: B2–B9 (loginFlow) rồi B10–B13 (checkInfoFlow) trừ khi onlyLogin
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
    logger.info("[adobe-v2] Lưu cookies: %d (expiry %d ngày cho session, %d có expirationDate)", cookies.length, DEFAULT_COOKIE_EXPIRY_DAYS, withExpiry);
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
