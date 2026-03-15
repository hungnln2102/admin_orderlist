/**
 * Login Adobe qua TLS-impersonating HTTP client (không cần browser).
 *
 * Dùng `impit` giả Chrome TLS fingerprint + HTTP/2 để bypass bot detection.
 * Flow: fetch login page → SUSI API → get cookies + access_token.
 *
 * Nếu thất bại → caller fallback sang Playwright (loginBrowser.js).
 */

const { Impit } = require("impit");
const logger = require("../../utils/logger");
const mailOtpService = require("../mailOtpService");

const SUSI_BASE = "https://auth.services.adobe.com";
const IMS_BASE = "https://ims-na1.adobelogin.com";
const ADMIN_CONSOLE = "https://adminconsole.adobe.com";
const CLIENT_ID = "aac_manage_teams";
const SCOPES = "AdobeID,openid,gnav,read_organizations,additional_info.roles";

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * Login Adobe qua HTTP với Chrome TLS fingerprint.
 * Thử nhiều strategy, trả về cookies + accessToken nếu thành công.
 */
async function loginViaSusi(email, password, options = {}) {
  const { mailBackupId = null } = options;

  const impit = new Impit({ browser: "chrome" });
  const cookies = new CookieStore();

  try {
    // ── Strategy 1: Direct IMS token (grant_type=password) ──
    logger.info("[susi] Strategy 1: Direct IMS token...");
    const directResult = await tryDirectToken(impit, email, password);
    if (directResult.success) return directResult;

    // ── Strategy 2: SUSI API flow ──
    logger.info("[susi] Strategy 2: SUSI API flow...");
    const susiResult = await trySusiApiFlow(impit, cookies, email, password, mailBackupId);
    if (susiResult.success) return susiResult;

    // ── Strategy 3: SUSI page + follow redirects ──
    logger.info("[susi] Strategy 3: Follow redirect flow...");
    const redirectResult = await tryRedirectFlow(impit, cookies, email, password);
    if (redirectResult.success) return redirectResult;

    return { success: false, error: "Tất cả SUSI strategies thất bại" };
  } catch (e) {
    logger.error("[susi] Lỗi không mong đợi: %s", e.message);
    return { success: false, error: e.message };
  } finally {
    try { impit.close(); } catch (_) {}
  }
}

// ────────────────── Strategy 1: Direct IMS token ──────────────────

async function tryDirectToken(impit, email, password) {
  try {
    const body = new URLSearchParams({
      grant_type: "password",
      username: email,
      password: password,
      client_id: CLIENT_ID,
      scope: SCOPES,
    });

    const res = await impit.fetch(`${IMS_BASE}/ims/token/v3`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": CHROME_UA,
      },
      body: body.toString(),
    });

    const data = await safeJson(res);
    logger.info("[susi] IMS token → status=%d, hasToken=%s, error=%s",
      res.status, !!data?.access_token, data?.error || "none");

    if (res.status === 200 && data?.access_token) {
      logger.info("[susi] IMS token thành công, có refresh_token=%s", !!data.refresh_token);
      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || null,
        cookies: [],
      };
    }

    return { success: false, error: `IMS ${res.status}: ${data?.error || "no token"}` };
  } catch (e) {
    return { success: false, error: `IMS error: ${e.message}` };
  }
}

// ────────────────── Strategy 2: SUSI API flow ──────────────────

async function trySusiApiFlow(impit, cookies, email, password, mailBackupId) {
  try {
    // Step 1: Fetch login page → session cookies + CSRF
    const loginUrl = buildLoginUrl();
    logger.info("[susi] Fetch login page...");

    const pageRes = await impit.fetch(loginUrl, {
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": CHROME_UA,
        "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
      },
    });

    cookies.collectFrom(pageRes);
    const html = await pageRes.text();
    logger.info("[susi] Login page → status=%d, url=%s, cookies=%d, htmlLen=%d",
      pageRes.status, (pageRes.url || "").slice(0, 100), cookies.size, html.length);

    // Parse CSRF / config from HTML
    const csrf = extractCsrf(html);
    const apiBase = extractApiBase(html);
    logger.info("[susi] csrf=%s, apiBase=%s", csrf ? csrf.slice(0, 20) + "..." : "null", apiBase || "default");

    // Step 2: Check email
    const susiApiHeaders = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": CHROME_UA,
      "Cookie": cookies.toString(),
      "X-IMS-ClientId": CLIENT_ID,
      "Origin": SUSI_BASE,
      "Referer": loginUrl,
    };
    if (csrf) susiApiHeaders["X-CSRF-Token"] = csrf;

    const checkPaths = [
      "/signin/v2/challenge/check",
      "/signin/v1/challenge/check",
      "/authenticate/check",
      "/signin/v2/accounts/check",
    ];

    let checkData = null;
    let successPath = null;

    for (const path of checkPaths) {
      const url = (apiBase || SUSI_BASE) + path;
      try {
        const res = await impit.fetch(url, {
          method: "POST",
          headers: susiApiHeaders,
          body: JSON.stringify({ username: email }),
        });
        cookies.collectFrom(res);
        const data = await safeJson(res);
        logger.info("[susi] CHECK %s → %d, data=%s", path, res.status, JSON.stringify(data)?.slice(0, 300));

        if (res.status >= 200 && res.status < 400 && data) {
          checkData = data;
          successPath = path.replace("/check", "");
          break;
        }
      } catch (e) {
        logger.debug("[susi] CHECK %s error: %s", path, e.message);
      }
    }

    if (!checkData) {
      return { success: false, error: "Không tìm được SUSI check endpoint hoạt động" };
    }

    // Step 3: Submit password
    susiApiHeaders["Cookie"] = cookies.toString();
    const authPaths = [
      successPath + "/authenticate",
      "/signin/v2/challenge/authenticate",
      "/signin/v2/authenticate",
    ];

    let authData = null;
    for (const path of [...new Set(authPaths)]) {
      const url = (apiBase || SUSI_BASE) + path;
      try {
        const res = await impit.fetch(url, {
          method: "POST",
          headers: susiApiHeaders,
          body: JSON.stringify({ username: email, password }),
          redirect: "manual",
        });
        cookies.collectFrom(res);
        const data = await safeJson(res);
        logger.info("[susi] AUTH %s → %d, data=%s", path, res.status, JSON.stringify(data)?.slice(0, 300));

        // Check for token in response body
        if (data?.access_token) {
          return { success: true, accessToken: data.access_token, cookies: cookies.toArray() };
        }

        // Check for token in redirect Location header
        const location = res.headers?.get?.("location") || "";
        const tokenFromLocation = extractTokenFromUrl(location);
        if (tokenFromLocation) {
          return { success: true, accessToken: tokenFromLocation, cookies: cookies.toArray() };
        }

        if (res.status >= 200 && res.status < 400) {
          authData = data;
          break;
        }
      } catch (e) {
        logger.debug("[susi] AUTH %s error: %s", path, e.message);
      }
    }

    // Step 4: Handle 2FA if needed
    if (needsVerification(authData || checkData)) {
      logger.info("[susi] 2FA required, chờ OTP từ IMAP...");
      const code = await getOtpCode(mailBackupId);
      if (!code) return { success: false, error: "Không lấy được OTP cho 2FA" };

      susiApiHeaders["Cookie"] = cookies.toString();
      const verifyPaths = [
        successPath + "/verify",
        "/signin/v2/challenge/verify",
      ];

      for (const path of [...new Set(verifyPaths)]) {
        const url = (apiBase || SUSI_BASE) + path;
        try {
          const res = await impit.fetch(url, {
            method: "POST",
            headers: susiApiHeaders,
            body: JSON.stringify({ code: String(code) }),
            redirect: "manual",
          });
          cookies.collectFrom(res);
          const data = await safeJson(res);
          logger.info("[susi] VERIFY %s → %d, data=%s", path, res.status, JSON.stringify(data)?.slice(0, 300));

          if (data?.access_token) {
            return { success: true, accessToken: data.access_token, cookies: cookies.toArray() };
          }

          const location = res.headers?.get?.("location") || "";
          const tokenFromLocation = extractTokenFromUrl(location);
          if (tokenFromLocation) {
            return { success: true, accessToken: tokenFromLocation, cookies: cookies.toArray() };
          }
        } catch (e) {
          logger.debug("[susi] VERIFY %s error: %s", path, e.message);
        }
      }
    }

    // Check if the auth flow set IMS cookies that can be exchanged for a token
    const imsToken = await tryExchangeImsSession(impit, cookies);
    if (imsToken) {
      return { success: true, accessToken: imsToken, cookies: cookies.toArray() };
    }

    return { success: false, error: "SUSI flow không trả về access_token" };
  } catch (e) {
    return { success: false, error: `SUSI flow error: ${e.message}` };
  }
}

// ────────────────── Strategy 3: Follow redirect flow ──────────────────

async function tryRedirectFlow(impit, cookies, email, password) {
  try {
    const callbackUrl = `${IMS_BASE}/ims/adobeid/${CLIENT_ID}/AdobeID/token?redirect_uri=${encodeURIComponent(ADMIN_CONSOLE + "/")}`;
    const authorizeUrl = `${IMS_BASE}/ims/authorize/v2?client_id=${CLIENT_ID}&scope=${encodeURIComponent(SCOPES)}&response_type=token&redirect_uri=${encodeURIComponent(ADMIN_CONSOLE + "/")}`;

    const res = await impit.fetch(authorizeUrl, {
      headers: {
        "Accept": "text/html",
        "User-Agent": CHROME_UA,
        "Cookie": cookies.toString(),
      },
      redirect: "manual",
    });

    cookies.collectFrom(res);
    const location = res.headers?.get?.("location") || "";
    logger.info("[susi] Authorize redirect → status=%d, location=%s", res.status, location.slice(0, 150));

    const token = extractTokenFromUrl(location);
    if (token) {
      return { success: true, accessToken: token, cookies: cookies.toArray() };
    }

    return { success: false, error: "Redirect flow: no token in response" };
  } catch (e) {
    return { success: false, error: `Redirect flow error: ${e.message}` };
  }
}

// ────────────────── IMS session exchange ──────────────────

async function tryExchangeImsSession(impit, cookies) {
  try {
    const res = await impit.fetch(
      `${IMS_BASE}/ims/check/v6/token?client_id=${CLIENT_ID}&scope=${encodeURIComponent(SCOPES)}`,
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": CHROME_UA,
          "Cookie": cookies.toString(),
        },
      }
    );

    const data = await safeJson(res);
    logger.info("[susi] IMS check/token → status=%d, hasToken=%s", res.status, !!data?.access_token);
    if (data?.access_token) return data.access_token;
  } catch (_) {}

  return null;
}

// ────────────────── Helpers ──────────────────

function buildLoginUrl() {
  const callback = `${IMS_BASE}/ims/adobeid/${CLIENT_ID}/AdobeID/token?redirect_uri=${encodeURIComponent(ADMIN_CONSOLE + "/")}`;
  return `${SUSI_BASE}/en_US/index.html?callback=${encodeURIComponent(callback)}&client_id=${CLIENT_ID}&scope=${encodeURIComponent(SCOPES)}&response_type=token&flow_type=token&idp_flow_type=login&locale=en_US`;
}

function extractCsrf(html) {
  const patterns = [
    /csrf[_-]?token["']?\s*[:=]\s*["']([^"']+)/i,
    /name=["']csrf["']\s+content=["']([^"']+)/i,
    /"csrfToken"\s*:\s*"([^"]+)"/,
    /data-csrf=["']([^"']+)/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractApiBase(html) {
  const m = html.match(/"apiUrl"\s*:\s*"([^"]+)"/);
  return m ? m[1] : null;
}

function extractTokenFromUrl(url) {
  if (!url) return null;
  const m = url.match(/[#&?]access_token=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function needsVerification(data) {
  if (!data) return false;
  return (
    data.authMethod === "verify" ||
    data.type === "verify" ||
    data.require2FA === true ||
    data.challengeType === "email" ||
    data.mfa === true ||
    /verify|2fa|challenge|otp/i.test(JSON.stringify(data))
  );
}

async function safeJson(res) {
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

async function getOtpCode(mailBackupId) {
  const envOtp = !!(
    process.env.ADOBE_OTP_IMAP_HOST &&
    (process.env.ADOBE_OTP_IMAP_USER || process.env.MAILTEST) &&
    (process.env.ADOBE_OTP_IMAP_PASSWORD || process.env.APPPASSWORD)
  );

  if (!mailBackupId && !envOtp) return null;

  for (let t = 0; t < 30; t++) {
    try {
      const code = mailBackupId
        ? await mailOtpService.fetchOtpFromEmail(mailBackupId, { useEnvFallback: false, senderFilter: "adobe" })
        : await mailOtpService.fetchOtpFromEmail(null, { useEnvFallback: true, senderFilter: "adobe" });
      if (code) {
        logger.info("[susi] OTP nhận được (length=%d)", String(code).length);
        return code;
      }
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 2000));
  }

  logger.warn("[susi] Hết thời gian chờ OTP (60s)");
  return null;
}

// ────────────────── Cookie store ──────────────────

class CookieStore {
  constructor() {
    this._map = new Map();
  }

  get size() { return this._map.size; }

  collectFrom(response) {
    const raw = response.headers?.getSetCookie?.() || [];
    for (const sc of raw) {
      const nameValue = sc.split(";")[0];
      const eqIdx = nameValue.indexOf("=");
      if (eqIdx < 1) continue;
      const name = nameValue.slice(0, eqIdx).trim();
      const value = nameValue.slice(eqIdx + 1);
      this._map.set(name, { name, value, raw: sc });
    }
  }

  toString() {
    return Array.from(this._map.values())
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
  }

  toArray() {
    return Array.from(this._map.values()).map((c) => {
      const parts = c.raw.split(";");
      const cookie = { name: c.name, value: c.value };
      for (const part of parts.slice(1)) {
        const trimmed = part.trim();
        const eqIdx = trimmed.indexOf("=");
        const key = (eqIdx > 0 ? trimmed.slice(0, eqIdx) : trimmed).toLowerCase();
        const val = eqIdx > 0 ? trimmed.slice(eqIdx + 1) : "";
        if (key === "domain") cookie.domain = val;
        if (key === "path") cookie.path = val || "/";
        if (key === "httponly") cookie.httpOnly = true;
        if (key === "secure") cookie.secure = true;
        if (key === "samesite") cookie.sameSite = val;
        if (key === "expires") {
          const ts = Math.floor(new Date(val).getTime() / 1000);
          if (ts > 0) cookie.expirationDate = ts;
        }
      }
      return cookie;
    });
  }
}

// ────────────────── Token Refresh (IMS grant_type=refresh_token) ──────────────────

/**
 * Lấy access_token mới từ refresh_token (sống ~2 tuần) mà không cần browser.
 * @param {string} refreshToken
 * @returns {{ success, accessToken, refreshToken } | { success: false, error }}
 */
async function tryRefreshToken(refreshToken) {
  if (!refreshToken) return { success: false, error: "Không có refresh_token" };

  const impit = new Impit({ browser: "chrome" });
  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      scope: SCOPES,
    });

    const res = await impit.fetch(`${IMS_BASE}/ims/token/v3`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": CHROME_UA,
      },
      body: body.toString(),
    });

    const data = await safeJson(res);
    logger.info("[susi] Refresh token → status=%d, hasToken=%s", res.status, !!data?.access_token);

    if (res.status === 200 && data?.access_token) {
      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Adobe đôi khi trả refresh_token mới
      };
    }

    return { success: false, error: `Refresh failed: ${res.status} ${data?.error || ""}` };
  } catch (e) {
    logger.warn("[susi] Refresh token error: %s", e.message);
    return { success: false, error: e.message };
  } finally {
    try { impit.close(); } catch (_) {}
  }
}

module.exports = { loginViaSusi, tryRefreshToken };
