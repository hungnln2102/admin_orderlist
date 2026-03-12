/**
 * Login Adobe — strategy (theo thứ tự ưu tiên):
 * 1. Fast path: saved cookies + token → thử API call thực
 * 2. SUSI HTTP: TLS Chrome fingerprint → login qua HTTP (không cần browser)
 * 3. Playwright: headless browser login (fallback cuối)
 */

const logger = require("../../utils/logger");
const { createHttpClient, importCookies } = require("./httpClient");
const { loginWithPlaywright } = require("./loginBrowser");
const { loginViaSusi } = require("./loginSusi");
const { ADMIN_CONSOLE_API_BASE, ADMIN_CONSOLE_CLIENT_ID } = require("./constants");

/**
 * Test session bằng API call thực.
 * SPA Admin Console luôn trả 200 (shell HTML) nên URL check không đáng tin.
 */
async function testSessionValid(client, savedAccessToken) {
  if (!savedAccessToken) {
    logger.info("[adobe-http] Không có saved token → cần login");
    return { valid: false };
  }

  try {
    const res = await client.get(`${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations`, {
      timeout: 10000,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${savedAccessToken}`,
        "x-api-key": ADMIN_CONSOLE_CLIENT_ID,
      },
    });

    if (res.status === 200 && res.data) {
      logger.info("[adobe-http] Token vẫn hợp lệ (JIL API 200)");
      return { valid: true };
    }

    logger.info("[adobe-http] Token hết hạn (JIL API status=%s)", res.status);
    return { valid: false };
  } catch (e) {
    logger.info("[adobe-http] Token hết hạn (error: %s)", e.message);
    return { valid: false };
  }
}

/**
 * Login Adobe — trả về HTTP client đã có session.
 */
async function loginViaHttp(email, password, options = {}) {
  const { savedCookies = [], savedAccessToken = null, mailBackupId = null } = options;

  // ── 1. Fast path: thử saved token với API call thực ──
  if (savedCookies.length > 0 && savedAccessToken) {
    logger.info("[adobe-http] Thử saved token + %d cookies...", savedCookies.length);
    const { client, jar } = createHttpClient();
    await importCookies(jar, savedCookies);

    const test = await testSessionValid(client, savedAccessToken);
    if (test.valid) {
      logger.info("[adobe-http] Session hợp lệ — bỏ qua login hoàn toàn");
      return { success: true, client, jar, accessToken: savedAccessToken, usedBrowser: false };
    }
  }

  // ── 2. SUSI HTTP: TLS Chrome fingerprint (không browser, nhẹ) ──
  logger.info("[adobe-http] Thử SUSI HTTP login (TLS Chrome)...");
  try {
    const susiResult = await loginViaSusi(email, password, { mailBackupId });

    if (susiResult.success && susiResult.accessToken) {
      logger.info("[adobe-http] SUSI HTTP login thành công! cookies=%d",
        susiResult.cookies?.length || 0);

      const { client, jar } = createHttpClient();
      if (susiResult.cookies?.length) {
        await importCookies(jar, susiResult.cookies);
      }

      return {
        success: true,
        client,
        jar,
        accessToken: susiResult.accessToken,
        usedBrowser: false,
      };
    }

    logger.info("[adobe-http] SUSI HTTP thất bại: %s → fallback Playwright", susiResult.error);
  } catch (e) {
    logger.warn("[adobe-http] SUSI HTTP error: %s → fallback Playwright", e.message);
  }

  // ── 3. Playwright fallback (browser headless) ──
  logger.info("[adobe-http] Fallback Playwright login...");
  const browserResult = await loginWithPlaywright(email, password, {
    savedCookies,
    mailBackupId,
  });

  if (!browserResult.success) {
    return { success: false, error: browserResult.error, client: null, jar: null };
  }

  const { client, jar } = createHttpClient();
  await importCookies(jar, browserResult.cookies);

  logger.info("[adobe-http] Playwright xong — %d cookies, hasToken=%s",
    browserResult.cookies.length, !!browserResult.accessToken);

  return {
    success: true,
    client,
    jar,
    accessToken: browserResult.accessToken,
    usedBrowser: true,
  };
}

module.exports = { loginViaHttp, testSessionValid };
