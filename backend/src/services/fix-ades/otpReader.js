/**
 * Fix Ades — đọc OTP qua GET /mail/read-otp-gpm?email=...
 * Host mặc định: https://api-2026-02.ades.support
 */

const logger = require("@/utils/logger");

const DEFAULT_BASE_URL = "https://api-2026-02.ades.support";
const DEFAULT_ENDPOINT = "/mail/read-otp-gpm";

const BASE_URL = (process.env.FIX_ADES_OTP_BASE_URL || DEFAULT_BASE_URL).replace(
  /\/+$/,
  ""
);
const ENDPOINT = process.env.FIX_ADES_OTP_ENDPOINT || DEFAULT_ENDPOINT;

const USER_AGENT =
  process.env.FIX_ADES_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function extractOtpCode(raw) {
  if (raw == null) return null;
  const str = String(raw);
  const direct = str.match(/\b(\d{4,8})\b/);
  if (direct?.[1]) return direct[1];
  return null;
}

function collectOtpCandidates(obj, out = [], parentKey = "") {
  if (obj == null) return out;
  if (typeof obj === "string") {
    out.push(obj);
    return out;
  }
  if (typeof obj === "number") {
    if (/otp|code|token|verification|value|authentication/i.test(parentKey)) {
      out.push(String(obj));
    }
    return out;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) collectOtpCandidates(item, out, parentKey);
    return out;
  }
  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      if (/otp|code|token|verification|authentication/i.test(key)) {
        out.push(value);
      }
      collectOtpCandidates(value, out, key);
    }
  }
  return out;
}

function resolveOtpFromPayload(json) {
  const data = json?.data;
  if (data && typeof data === "object") {
    if (data.success === false) return null;

    const directFields = [
      data.otp,
      data.code,
      data.authenticationCode,
      data.authentication_code,
      data.value,
    ];
    for (const field of directFields) {
      const code = extractOtpCode(field);
      if (code) return code;
    }
  }

  const candidates = collectOtpCandidates(json);
  for (const candidate of candidates) {
    const code = extractOtpCode(candidate);
    if (code) return code;
  }
  return null;
}

/**
 * @param {{ accountEmail: string, timeoutMs?: number }} params
 * @returns {Promise<string|null>}
 */
async function fetchOtpFromAdesApi({ accountEmail, timeoutMs = 10000 }) {
  const email = String(accountEmail || "").trim();
  if (!email) return null;

  const url = new URL(ENDPOINT, `${BASE_URL}/`);
  url.searchParams.set("email", email);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn("[fix-ades-otp] API returned non-200: %s", response.status);
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text().catch(() => "");
      return extractOtpCode(text);
    }

    const json = await response.json().catch(() => null);
    const code = resolveOtpFromPayload(json);
    if (!code && json?.data?.error) {
      logger.debug("[fix-ades-otp] chưa có OTP: %s", String(json.data.error).slice(0, 160));
    }
    return code;
  } catch (error) {
    logger.warn("[fix-ades-otp] read failed: %s", error.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  fetchOtpFromAdesApi,
};
