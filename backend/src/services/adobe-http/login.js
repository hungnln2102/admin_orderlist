/**
 * Login Adobe — strategy:
 * 1. Fast path: có saved cookies + token → import HTTP client → test session
 * 2. Slow path: cookies hết hạn → Playwright headless login → lấy cookies mới
 */

const logger = require("../../utils/logger");
const { createHttpClient, importCookies } = require("./httpClient");
const { loginWithPlaywright } = require("./loginBrowser");
const { ADMIN_CONSOLE_BASE } = require("./constants");

/**
 * Test saved cookies bằng cách gọi Admin Console.
 * Nếu redirect về login → session hết hạn.
 */
async function testSessionValid(client) {
  try {
    const res = await client.get(`${ADMIN_CONSOLE_BASE}/`, {
      maxRedirects: 5,
      timeout: 15000,
      headers: { Accept: "text/html" },
    });

    const finalUrl = res.request?.res?.responseUrl || res.config?.url || "";

    if (finalUrl.includes("auth.services.adobe.com") || finalUrl.includes("adobelogin.com")) {
      return { valid: false };
    }

    if (finalUrl.includes("adminconsole.adobe.com")) {
      return { valid: true };
    }

    return { valid: false };
  } catch (_) {
    return { valid: false };
  }
}

/**
 * Login Adobe — trả về HTTP client đã có session.
 *
 * @param {string} email
 * @param {string} password
 * @param {{ savedCookies?: Array, savedAccessToken?: string, mailBackupId?: number|null }} [options]
 */
async function loginViaHttp(email, password, options = {}) {
  const { savedCookies = [], savedAccessToken = null, mailBackupId = null } = options;

  // ── Fast path: thử saved cookies + token ──
  if (savedCookies.length > 0) {
    logger.info("[adobe-http] Thử session từ %d saved cookies...", savedCookies.length);
    const { client, jar } = createHttpClient();
    await importCookies(jar, savedCookies);

    const test = await testSessionValid(client);
    if (test.valid) {
      logger.info("[adobe-http] Session cookies hợp lệ — bỏ qua browser (savedToken=%s)", savedAccessToken ? "có" : "null");
      return { success: true, client, jar, accessToken: savedAccessToken };
    }
    logger.info("[adobe-http] Session hết hạn, cần Playwright login...");
  }

  // ── Slow path: Playwright login ──
  const browserResult = await loginWithPlaywright(email, password, {
    savedCookies,
    mailBackupId,
  });

  if (!browserResult.success) {
    return { success: false, error: browserResult.error, client: null, jar: null };
  }

  const { client, jar } = createHttpClient();
  await importCookies(jar, browserResult.cookies);

  logger.info("[adobe-http] Playwright login xong — %d cookies, hasToken=%s",
    browserResult.cookies.length, !!browserResult.accessToken);

  return {
    success: true,
    client,
    jar,
    accessToken: browserResult.accessToken,
  };
}

module.exports = { loginViaHttp, testSessionValid };
