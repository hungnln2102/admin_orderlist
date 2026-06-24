/**
 * Fix Ades — gọi API tại https://api-2026-02.ades.support/ades-support
 *
 * Auth flow (xác nhận lại bằng PowerShell snippet 11/05):
 *   1) POST /auth/token  body `{}` → trả `{ data: { token } }` (JWT)
 *   2) POST /account/check  header `Authorization: <token>` (RAW, không Bearer)
 *      body `{ email }` → trả thông tin gói.
 *   3) POST /renew-adobe/<email>  header `Authorization: Bearer <token>` body `{}` → renew.
 *
 * Token short-lived (Ades cấp ~ vài giây/phút) → mặc định không cache.
 */

const logger = require("../../utils/logger");

const DEFAULT_BASE_URL = "https://api-2026-02.ades.support/ades-support";
const DEFAULT_ORIGIN = "https://var.ctv.ac";
const DEFAULT_REFERER_BASE = "https://var.ctv.ac";

const BASE_URL = (process.env.FIX_ADES_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
const ORIGIN = process.env.FIX_ADES_ORIGIN || DEFAULT_ORIGIN;
const REFERER_BASE = process.env.FIX_ADES_REFERER_BASE || DEFAULT_REFERER_BASE;

/**
 * UA giả browser — vài middleware "block default node UA". Override bằng
 * env `FIX_ADES_USER_AGENT` nếu cần.
 */
const USER_AGENT =
  process.env.FIX_ADES_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * TTL token (ms). Mặc định 30s — Ades cấp token short-lived. Đặt cao quá → 401
 * "Token không tồn tại". Override qua env `FIX_ADES_TOKEN_TTL_MS`.
 */
const TOKEN_TTL_MS = (() => {
  const raw = Number.parseInt(process.env.FIX_ADES_TOKEN_TTL_MS || "", 10);
  if (Number.isFinite(raw) && raw >= 1_000 && raw <= 6 * 60 * 60 * 1000) return raw;
  return 30 * 1000;
})();

/**
 * Mặc định = true → luôn fetch token mới mỗi request. Set "false" để bật cache
 * (chỉ khi đã verify token có thể reuse).
 */
const ALWAYS_FRESH_TOKEN =
  String(process.env.FIX_ADES_ALWAYS_FRESH_TOKEN ?? "true").toLowerCase() !== "false";

/** Timeout HTTP request (ms). */
const HTTP_TIMEOUT_MS = (() => {
  const raw = Number.parseInt(process.env.FIX_ADES_HTTP_TIMEOUT_MS || "", 10);
  if (Number.isFinite(raw) && raw >= 5_000 && raw <= 60_000) return raw;
  return 15_000;
})();

let tokenCache = null; // { token, expiresAt }
let tokenInflight = null;

function buildRefererForEmail() {
  return `${REFERER_BASE.replace(/\/+$/, "")}/`;
}

function buildCommonHeaders(email) {
  return {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "vi,en;q=0.9",
    "Content-Type": "application/json",
    Origin: ORIGIN,
    Referer: buildRefererForEmail(email),
    "User-Agent": USER_AGENT,
  };
}

async function postJson(url, body, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, ok: res.ok, json, raw: text };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAdesToken({ refererEmail = "" } = {}) {
  const headers = buildCommonHeaders(refererEmail);
  const result = await postJson(`${BASE_URL}/auth/token`, {}, headers);
  if (!result.ok) {
    const msg =
      result.json?.message ||
      result.json?.error ||
      `Auth token thất bại (HTTP ${result.status}).`;
    const err = new Error(msg);
    err.status = result.status;
    err.body = result.raw;
    throw err;
  }
  // Hỗ trợ nhiều shape phổ biến: { data: { token } }, { token }, { access_token }…
  const json = result.json || {};
  const token =
    json?.data?.token ||
    json?.data?.access_token ||
    json?.data?.accessToken ||
    json?.token ||
    json?.access_token ||
    json?.accessToken ||
    "";
  if (!token || typeof token !== "string") {
    logger.warn("[fix-ades] /auth/token response thiếu trường token", {
      status: result.status,
      bodyKeys: Object.keys(json || {}),
      rawHead: typeof result.raw === "string" ? result.raw.slice(0, 200) : null,
    });
    const err = new Error("Auth token: response không có trường token.");
    err.status = result.status;
    err.body = result.raw;
    throw err;
  }
  logger.debug("[fix-ades] /auth/token ok", {
    refererEmail,
    tokenLen: token.length,
    tokenHead: token.slice(0, 6) + "…",
  });
  return token;
}

async function getAdesToken({ forceRefresh = false, refererEmail = "" } = {}) {
  const now = Date.now();
  if (
    !ALWAYS_FRESH_TOKEN &&
    !forceRefresh &&
    tokenCache &&
    tokenCache.expiresAt > now
  ) {
    return tokenCache.token;
  }
  if (!ALWAYS_FRESH_TOKEN && !forceRefresh && tokenInflight) {
    return tokenInflight;
  }
  tokenInflight = (async () => {
    try {
      const token = await fetchAdesToken({ refererEmail });
      tokenCache = { token, expiresAt: Date.now() + TOKEN_TTL_MS };
      return token;
    } finally {
      tokenInflight = null;
    }
  })();
  return tokenInflight;
}

function normalizeEmail(email) {
  const e = String(email || "").trim();
  if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    const err = new Error("Email không hợp lệ.");
    err.status = 400;
    throw err;
  }
  return e;
}

/**
 * Build header `Authorization` cho Ades. Ades nhận RAW token (không có "Bearer ").
 * Truyền cả `x-access-token` để back-compat — nếu Ades đổi về key cũ vẫn pass.
 */
function buildAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "x-access-token": token,
  };
}

async function callWithToken(sendOnce, refererEmail) {
  let token = await getAdesToken({ refererEmail });
  let result = await sendOnce(token);
  if (!result.ok && (result.status === 401 || result.status === 403)) {
    token = await getAdesToken({ forceRefresh: true, refererEmail });
    result = await sendOnce(token);
  }
  return result;
}

function buildAuthedHeaders(email, token) {
  return {
    ...buildCommonHeaders(email),
    ...buildAuthHeaders(token),
  };
}

async function postAccountCheck(email, token) {
  const headers = buildAuthedHeaders(email, token);
  logger.debug("[fix-ades] POST /account/check", {
    email,
    tokenLen: token?.length || 0,
    tokenHead: token ? token.slice(0, 6) + "..." : null,
  });
  return postJson(BASE_URL + "/account/check", { email }, headers);
}

function getAdesPayloadData(json) {
  return json?.data && typeof json.data === "object" ? json.data : json;
}

function getAdesTransferTeamResponse(json) {
  const data = getAdesPayloadData(json);
  if (data?.transferTeamResponse && typeof data.transferTeamResponse === "object") {
    return data.transferTeamResponse;
  }
  if (
    data?.adesSource?.transferTeamResponse &&
    typeof data.adesSource.transferTeamResponse === "object"
  ) {
    return data.adesSource.transferTeamResponse;
  }
  return null;
}

function isUsableAdesCheckResult(result) {
  if (!result?.ok || !result.json || typeof result.json !== "object") return false;
  const data = getAdesPayloadData(result.json);
  if (!data || typeof data !== "object") return false;
  if (getAdesTransferTeamResponse(result.json)) return true;
  return Boolean(
    data.email ||
      data.status ||
      data.accountStatus ||
      data.productName ||
      data.groupName ||
      data.teamName ||
      data.product ||
      data.user
  );
}

/**
 * Check 1 email qua hệ thống Fix Ades.
 * @param {string} email
 * @returns {Promise<{ ok: boolean, status: number, data: any, raw: string }>}
 */
async function checkAdesAccount(email) {
  const e = normalizeEmail(email);
  const result = await callWithToken((token) => postAccountCheck(e, token), e);

  if (!result.ok) {
    logger.warn("[fix-ades] check failed", {
      email: e,
      status: result.status,
      body: typeof result.raw === "string" ? result.raw.slice(0, 320) : null,
    });
  }

  return {
    ok: result.ok,
    status: result.status,
    data: result.json,
    raw: result.raw,
  };
}

/**
 * Check transfer profile status for the Ades `/additional/account/transfer` flow.
 *
 * Ades web currently checks the account via `/account/check`; keep this
 * exported function as a compatibility wrapper for our internal route name.
 *
 * @param {string} email
 * @returns {Promise<{ ok: boolean, status: number, data: any, raw: string }>}
 */
async function checkAdesTransferStatus(email) {
  const e = normalizeEmail(email);
  const result = await callWithToken((token) => postAccountCheck(e, token), e);

  if (!isUsableAdesCheckResult(result)) {
    logger.warn("[fix-ades] check transfer status failed or unusable", {
      email: e,
      status: result?.status,
      ok: result?.ok,
      body: typeof result?.raw === "string" ? result.raw.slice(0, 320) : null,
    });
  }

  return {
    ok: Boolean(result?.ok),
    status: result?.status || 502,
    data: result?.json,
    raw: result?.raw,
  };
}

/**
 * Renew 1 email qua hệ thống Fix Ades.
 * Endpoint: POST `${BASE_URL}/renew-adobe/<email>` (email trên URL path, body rỗng).
 * Response thành công: `{ success: true, creditsRemaining, message, user: { ... } }`.
 *
 * @param {string} email
 * @returns {Promise<{ ok, status, data, raw }>}
 */
async function renewAdesAccount(email) {
  const e = normalizeEmail(email);
  const url = `${BASE_URL}/renew-adobe/${encodeURIComponent(e)}`;
  const result = await callWithToken(async (token) => {
    const headers = {
      ...buildCommonHeaders(e),
      ...buildAuthHeaders(token),
    };
    return postJson(url, {}, headers);
  }, e);

  if (!result.ok) {
    logger.warn("[fix-ades] renew failed", {
      email: e,
      status: result.status,
      body: typeof result.raw === "string" ? result.raw.slice(0, 320) : null,
    });
  } else {
    logger.info("[fix-ades] renew success", {
      email: e,
      creditsRemaining: result.json?.creditsRemaining,
      durationMonths: result.json?.user?.durationMonths,
      expiresAt: result.json?.user?.expiresAt,
    });
  }

  return {
    ok: result.ok,
    status: result.status,
    data: result.json,
    raw: result.raw,
  };
}


/**
 * Sync dữ liệu ADO cho 1 email qua hệ thống Fix Ades.
 * Endpoint: POST `${BASE_URL}/sync-ado-account` body `{ email }`.
 *
 * @param {string} email
 * @returns {Promise<{ ok, status, data, raw }>}
 */
async function syncAdesAccount(email) {
  const e = normalizeEmail(email);
  const result = await callWithToken(async (token) => {
    const headers = {
      ...buildCommonHeaders(e),
      ...buildAuthHeaders(token),
    };
    logger.debug("[fix-ades] POST /sync-ado-account", {
      email: e,
      tokenLen: token?.length || 0,
      tokenHead: token ? token.slice(0, 6) + "..." : null,
    });
    return postJson(`${BASE_URL}/sync-ado-account`, { email: e }, headers);
  }, e);

  if (!result.ok) {
    logger.warn("[fix-ades] sync ADO failed", {
      email: e,
      status: result.status,
      body: typeof result.raw === "string" ? result.raw.slice(0, 320) : null,
    });
  } else {
    logger.info("[fix-ades] sync ADO success", {
      email: e,
      success: result.json?.success ?? result.json?.data?.success,
    });
  }

  return {
    ok: result.ok,
    status: result.status,
    data: result.json,
    raw: result.raw,
  };
}

module.exports = {
  BASE_URL,
  getAdesToken,
  checkAdesAccount,
  checkAdesTransferStatus,
  renewAdesAccount,
  syncAdesAccount,
};
