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
const { ADMIN_CONSOLE_API_BASE, ADMIN_CONSOLE_CLIENT_ID, TIMEOUTS } = require("./constants");

/**
 * Test session bằng API call thực — thử nhiều x-api-key để tương thích
 * với cả token từ SUSI (aac_manage_teams) và Playwright (ONESIE1).
 */
async function testSessionValid(client, savedAccessToken) {
  if (!savedAccessToken) {
    logger.info("[adobe-http] Không có saved token → cần login");
    return { valid: false };
  }

  const CLIENT_IDS = ["ONESIE1", "aac_manage_teams", "AdobeAnalyticsUI"];
  const url = `${ADMIN_CONSOLE_API_BASE}/jil-api/v2/organizations`;

  for (const clientId of CLIENT_IDS) {
    try {
      const res = await client.get(url, {
        timeout: TIMEOUTS.TEST_TOKEN,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${savedAccessToken}`,
          "x-api-key": clientId,
        },
      });

      if (res.status === 200 && res.data) {
        logger.info("[adobe-http] Token hợp lệ (JIL API 200, x-api-key=%s)", clientId);
        return { valid: true };
      }

      logger.info("[adobe-http] Token fail (x-api-key=%s, status=%s)", clientId, res.status);
    } catch (e) {
      logger.debug("[adobe-http] Token test error (x-api-key=%s): %s", clientId, e.message);
    }
  }

  logger.info("[adobe-http] Token hết hạn (tất cả x-api-key đều fail)");
  return { valid: false };
}

/**
 * Login Adobe — trả về HTTP client đã có session.
 * Thứ tự ưu tiên:
 * 0. Refresh token: không cần browser nếu có refresh_token hợp lệ (~2 tuần)
 * 1. Fast path: saved cookies + access_token hợp lệ
 * 2. SUSI HTTP: TLS Chrome fingerprint (không browser)
 * 3. Playwright fallback (mở browser ~30-60s)
 */
async function loginViaHttp(email, password, options = {}) {
  const {
    savedCookies = [],
    savedAccessToken = null,
    savedRefreshToken = null,
    mailBackupId = null,
  } = options;

  // ── 0. Refresh token: lấy access_token mới không cần browser ──
  if (savedRefreshToken) {
    logger.info("[adobe-http] Thử refresh token (không cần browser)...");
    try {
      const { tryRefreshToken } = require("./loginSusi");
      const refreshResult = await tryRefreshToken(savedRefreshToken);
      if (refreshResult.success) {
        logger.info("[adobe-http] Refresh token thành công! Không cần mở browser.");
        const { client, jar } = createHttpClient();
        if (savedCookies.length) await importCookies(jar, savedCookies);
        return {
          success: true, client, jar,
          accessToken: refreshResult.accessToken,
          refreshToken: refreshResult.refreshToken,
          usedBrowser: false,
        };
      }
      logger.info("[adobe-http] Refresh token thất bại: %s", refreshResult.error);
    } catch (e) {
      logger.warn("[adobe-http] Refresh token error: %s", e.message);
    }
  }

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
      logger.info("[adobe-http] SUSI HTTP login thành công! cookies=%d, hasRefresh=%s",
        susiResult.cookies?.length || 0, !!susiResult.refreshToken);

      const { client, jar } = createHttpClient();
      if (susiResult.cookies?.length) {
        await importCookies(jar, susiResult.cookies);
      }

      return {
        success: true, client, jar,
        accessToken: susiResult.accessToken,
        refreshToken: susiResult.refreshToken || null,
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

  logger.info("[adobe-http] Playwright xong — %d cookies, hasToken=%s, orgId=%s, hasBrowserData=%s",
    browserResult.cookies.length, !!browserResult.accessToken, browserResult.orgId || "(null)", !!browserResult.browserData);

  return {
    success: true,
    client,
    jar,
    accessToken: browserResult.accessToken,
    refreshToken: browserResult.refreshToken || null,
    usedBrowser: true,
    orgId: browserResult.orgId || null,
    browserData: browserResult.browserData || null,
  };
}

module.exports = { loginViaHttp, testSessionValid };
