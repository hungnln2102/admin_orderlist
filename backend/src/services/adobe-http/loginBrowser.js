/**
 * Login Adobe bằng Playwright headless Chromium.
 * Chỉ mở browser để login, sau đó đóng ngay.
 * Trả về cookies + access token cho HTTP client dùng tiếp.
 */

const { chromium } = require("playwright");
const logger = require("../../utils/logger");
const { getPlaywrightProxyOptions } = require("./proxyConfig");
const { fetchOrgDataInBrowser } = require("./fetchOrgDataBrowser");
const {
  extractOrgIdFromUrl,
  extractTokenFromPage,
  toPwCookies,
  fromPwCookies,
} = require("./loginBrowser.shared");
const { handle2FA } = require("./loginBrowser.otp");
const {
  detectScreen,
  enterPassword,
  maybeSkipSecurityPrompt,
  handleProgressiveProfile,
} = require("./loginBrowser.screens");

// Trang chủ Adobe — vào đây, click Sign in rồi mới đăng nhập.
const ADMIN_CONSOLE_URL = "https://adminconsole.adobe.com/";
const ADOBE_HOME_URL = "https://www.adobe.com/";

/**
 * Login Adobe bằng Playwright, trả về cookies + access token.
 * Browser chỉ mở tạm (~15-30s) rồi đóng ngay.
 */
async function loginWithPlaywright(email, password, options = {}) {
  const { savedCookies = [], mailBackupId = null } = options;

  const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";
  const proxyOptions = getPlaywrightProxyOptions();
  if (proxyOptions) logger.info("[adobe-login] Dùng proxy: %s", proxyOptions.server);
  logger.info("[adobe-login] Khởi động Playwright Chromium (headless=%s)...", headless);
  const launchOptions = {
    headless,
    slowMo: headless ? 0 : 80,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      // Giảm lỗi mạng kiểu ERR_HTTP2_PROTOCOL_ERROR/QUIC trên một số môi trường/proxy
      "--disable-http2",
      "--disable-quic",
    ],
  };
  if (proxyOptions) launchOptions.proxy = proxyOptions;
  const browser = await chromium.launch(launchOptions);

  let accessToken = null;

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    // Bắt access_token từ URL redirect (token xuất hiện rất ngắn trong URL fragment)
    page.on("framenavigated", async (frame) => {
      if (frame !== page.mainFrame()) return;
      try {
        const url = frame.url() || "";
        const m = url.match(/access_token=([^&#]+)/);
        if (m && !accessToken) {
          accessToken = decodeURIComponent(m[1]);
          logger.info("[adobe-login] Captured token từ frame URL");
        }
        if (!accessToken) {
          const hash = await frame.evaluate(() => window.location.hash).catch(() => "");
          const h = hash.match(/access_token=([^&]+)/);
          if (h) {
            accessToken = decodeURIComponent(h[1]);
            logger.info("[adobe-login] Captured token từ URL hash");
          }
        }
      } catch (_) {}
    });

    // Bắt token từ response URL (backup — IMS redirect chain)
    page.on("response", (response) => {
      if (accessToken) return;
      try {
        const url = response.url() || "";
        const m = url.match(/access_token=([^&#]+)/);
        if (m) {
          accessToken = decodeURIComponent(m[1]);
          logger.info("[adobe-login] Captured token từ response URL");
        }
      } catch (_) {}
    });

    // Bắt token từ request header khi Admin Console gọi API (jil-api, usermanagement)
    page.on("request", (request) => {
      if (accessToken) return;
      try {
        const headers = request.headers();
        const auth = headers["authorization"] || headers["Authorization"] || "";
        if (auth.startsWith("Bearer ") && auth.length > 50) {
          accessToken = auth.slice(7).trim();
          logger.info("[adobe-login] Captured token từ API request header");
        }
      } catch (_) {}
    });

    // --- Cookie login (fast path) ---
    if (savedCookies.length > 0) {
      const pwCookies = toPwCookies(savedCookies);
      if (pwCookies.length > 0) {
        await context.addCookies(pwCookies);
        logger.info("[adobe-login] Import %d cookies, cookie-login...", pwCookies.length);

        await page.goto("https://adminconsole.adobe.com/", {
          waitUntil: "networkidle",
          timeout: 45000,
        }).catch(() => {});

        await page.waitForTimeout(3000);
        const url1 = page.url();
        logger.info("[adobe-login] [URL] Sau cookie-login navigate: %s", url1.slice(0, 120));

        if (url1.includes("auth.services") || url1.includes("adobelogin.com")) {
          logger.info("[adobe-login] Cookies hết hạn (redirect → login page)");
        } else {
          // Vẫn ở Admin Console → cookies hợp lệ, đợi SPA route xong
          try {
            await page.waitForFunction(
              () => window.location.href.includes("@AdobeOrg"),
              { timeout: 15000 }
            );
          } catch (_) {
            logger.info("[adobe-login] SPA chưa route tới @AdobeOrg, vẫn thử extract token...");
          }
          // Đợi SPA gọi API để bắt token từ request header
          await page.waitForTimeout(5000);
          if (!accessToken) accessToken = await extractTokenFromPage(page);
          const finalUrl = page.url();
          const orgId = extractOrgIdFromUrl(finalUrl);
          if (orgId) logger.info("[adobe-login] Cookie-login OK — orgId=%s (từ URL)", orgId);
          logger.info("[adobe-login] Cookie-login OK — url=%s, hasToken=%s", finalUrl, !!accessToken);

          const cookies = await context.cookies();
          return { success: true, cookies: fromPwCookies(cookies), accessToken, orgId };
        }
      }
    }

    // --- Form login ---
    // Vào www.adobe.com → đóng popup → click Sign in → đăng nhập
    logger.info("[adobe-login] Form login: %s", email);
    await page.goto(ADOBE_HOME_URL, { waitUntil: "domcontentloaded", timeout: 30000 }).catch((e) => {
      logger.warn("[adobe-login] Goto adobe.com timeout: %s", e.message);
    });
    logger.info("[adobe-login] [URL] adobe.com: %s", page.url().slice(0, 80));

    // Đóng popup region / cookie banner nếu xuất hiện
    await page.waitForTimeout(2000);
    const popupClose = page.locator([
      'button[aria-label="Close"]',
      'button[aria-label="close"]',
      'button[data-dismiss="modal"]',
      '.dialog-close',
      '.modal-close',
      '.close-button',
      '[class*="close"]',
    ].join(", ")).first();
    const popupClosed = await popupClose.click({ timeout: 3000 }).then(() => true).catch(() => false);
    if (popupClosed) {
      logger.info("[adobe-login] Đã đóng popup");
      await page.waitForTimeout(800);
    }

    // Click nút Sign in — dùng đúng class từ inspect element
    logger.info("[adobe-login] Click nút Sign in...");
    const clicked = await page.locator("button.profile-comp.secondary-button").first()
      .click({ timeout: 8000 }).then(() => true).catch(async () => {
        logger.info("[adobe-login] Fallback selectors cho Sign in...");
        // Thử các selector khác theo thứ tự
        const fallbacks = [
          'a[href*="signin"]',
          '[class*="feds-signIn"]',
          'button[class*="profile-comp"]',
          'a:text-is("Sign in")',
          'button:text-is("Sign in")',
        ];
        for (const sel of fallbacks) {
          const ok = await page.locator(sel).first()
            .click({ timeout: 3000 }).then(() => true).catch(() => false);
          if (ok) return true;
        }
        // Last resort: getByRole
        return page.getByRole("link", { name: /sign\s*in/i }).first()
          .click({ timeout: 3000 }).then(() => true).catch(() => false);
      });
    logger.info("[adobe-login] Click Sign in: %s", clicked ? "OK" : "không tìm thấy nút");

    // Đợi redirect sang trang login
    await page.waitForURL(/auth\.services\.adobe\.com|adobelogin\.com/, { timeout: 20000 }).catch(() => {});
    logger.info("[adobe-login] [URL] Sau Sign in click: %s", page.url().slice(0, 120));

    // Nếu không redirect được, navigate thẳng Admin Console
    if (!page.url().includes("auth.services") && !page.url().includes("adobelogin")) {
      logger.warn("[adobe-login] Không redirect được từ adobe.com, thử navigate Admin Console...");
      await page.goto(ADMIN_CONSOLE_URL, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
      await page.waitForURL(/auth\.services\.adobe\.com|adobelogin\.com/, { timeout: 15000 }).catch(() => {});
      logger.info("[adobe-login] [URL] Sau Admin Console fallback: %s", page.url().slice(0, 120));
    }

    logger.info("[adobe-login] [URL] Trang login: %s", page.url().slice(0, 120));
    const emailInput = page.locator('input[name="username"], input[type="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: "visible", timeout: 45000 });
    await emailInput.click();
    await page.keyboard.type(email, { delay: 25 });
    await page.waitForTimeout(150);
    await page.keyboard.press("Enter");

    // B2: Đợi xem trang nào xuất hiện (2FA / password / redirect)
    logger.info("[adobe-login] Đợi phản hồi sau email...");
    const afterEmail = await detectScreen(page, 15000);
    logger.info("[adobe-login] Sau email → screen: %s", afterEmail);

    // B3: Xử lý theo screen
    if (afterEmail === "2fa") {
      logger.info("[adobe-login] [URL] Trước 2FA: %s", page.url().slice(0, 120));
      await handle2FA(page, mailBackupId);
      logger.info("[adobe-login] [URL] Sau 2FA: %s", page.url().slice(0, 120));
      const after2fa = await detectScreen(page, 10000);
      logger.info("[adobe-login] Sau 2FA → screen: %s", after2fa);
      if (after2fa === "password") {
        await enterPassword(page, password);
        logger.info("[adobe-login] [URL] Sau password: %s", page.url().slice(0, 120));
      }
    } else if (afterEmail === "password") {
      await enterPassword(page, password);
      logger.info("[adobe-login] [URL] Sau password: %s", page.url().slice(0, 120));
      const afterPw = await detectScreen(page, 10000);
      logger.info("[adobe-login] Sau password → screen: %s", afterPw);
      if (afterPw === "2fa") {
        logger.info("[adobe-login] [URL] Trước 2FA: %s", page.url().slice(0, 120));
        await handle2FA(page, mailBackupId);
        logger.info("[adobe-login] [URL] Sau 2FA: %s", page.url().slice(0, 120));
      }
    } else if (afterEmail === "unknown") {
      logger.warn("[adobe-login] [URL] Unknown screen: %s", page.url().slice(0, 120));
    }

    // B4: Skip security prompt + progressive profile
    await maybeSkipSecurityPrompt(page);
    await handleProgressiveProfile(page, mailBackupId);

    // B5: Chờ login thành công
    if (!isOnAdobeSite(page.url())) {
      logger.info("[adobe-login] Chờ redirect thành công (tối đa 90s)...");
      await page.waitForFunction(
        () => {
          const h = window.location.href;
          return (
            h.includes("@AdobeOrg") ||
            (/^https?:\/\/([a-z0-9-]+\.)*adobe\.com/i.test(h) && !h.includes("auth.services"))
          );
        },
        { timeout: 90000 }
      );
      await page.waitForTimeout(2500);
    }

    // B6: Lấy token — thử nhiều lần (SPA cần thời gian initialize)
    if (!accessToken) accessToken = await extractTokenFromPage(page);

    // B7: Nếu chưa ở Admin Console, navigate tới đó
    const currentUrl = page.url();
    if (!currentUrl.includes("adminconsole.adobe.com")) {
      logger.info("[adobe-login] Navigate tới Admin Console để lấy cookies...");
      await page.goto("https://adminconsole.adobe.com/", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(3000);
    }

    // B7b: Chờ SPA chuyển URL có @AdobeOrg (để lấy orgId chắc chắn — tránh 401 token vẫn có orgId)
    try {
      await page.waitForFunction(
        () => window.location.href.includes("@AdobeOrg"),
        { timeout: 15000 }
      );
      await page.waitForTimeout(1500);
    } catch (_) {
      logger.warn("[adobe-login] URL chưa có @AdobeOrg sau 15s, tiếp tục...");
    }

    // B8: Retry token extraction — đợi SPA set localStorage
    if (!accessToken) {
      for (let i = 0; i < 5; i++) {
        accessToken = await extractTokenFromPage(page);
        if (accessToken) break;
        await page.waitForTimeout(2000);
      }
    }
    logger.info("[adobe-login] Token sau tất cả extraction: %s", accessToken ? "CÓ" : "NULL");

    const finalUrl = page.url();
    let orgId = extractOrgIdFromUrl(finalUrl);
    if (!orgId && (finalUrl.includes("adminconsole.adobe.com") || finalUrl.includes("adobe.com"))) {
      orgId = extractOrgIdFromUrl(await page.evaluate(() => window.location.href).catch(() => ""));
    }

    // B9: Fetch dữ liệu org/products/users NGAY TRONG Playwright session (trước khi đóng browser)
    // Playwright context có session hợp lệ → page.request tự dùng cookies browser
    let browserData = null;
    if (orgId && accessToken) {
      logger.info("[adobe-login] Fetching org data bên trong browser session (orgId=%s)...", orgId);
      browserData = await fetchOrgDataInBrowser(page, orgId, accessToken);
      if (browserData) {
        logger.info("[adobe-login] browserData: orgName=%s, products=%d, users=%d",
          browserData.orgName || "(null)", browserData.products?.length ?? 0, browserData.users?.length ?? 0);
      }
    } else {
      logger.warn("[adobe-login] Bỏ qua fetchOrgDataInBrowser (orgId=%s, hasToken=%s)", orgId || "null", !!accessToken);
    }

    const cookies = await context.cookies();
    logger.info("[adobe-login] Login thành công! URL: %s, hasToken: %s, orgId: %s, cookies: %d",
      finalUrl.slice(0, 80), !!accessToken, orgId || "(null)", cookies.length);

    return { success: true, cookies: fromPwCookies(cookies), accessToken, orgId, browserData };
  } catch (error) {
    logger.error("[adobe-login] Login thất bại: %s", error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
    logger.info("[adobe-login] Browser đã đóng");
  }
}

module.exports = {
  loginWithPlaywright,
  toPwCookies,
  fromPwCookies,
  detectScreen,
  enterPassword,
  handle2FA,
  maybeSkipSecurityPrompt,
  handleProgressiveProfile,
  extractTokenFromPage,
};
