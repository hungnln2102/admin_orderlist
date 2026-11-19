const { readExternalResponse } = require("@/utils/safeExternalRequest");

function extractOtpCode(raw) {
  if (raw == null) return null;
  const str = String(raw).trim();
  // Loại trừ chuỗi định dạng ngày tháng ISO (VD: 2026-11-19...) để tránh bắt nhầm năm làm OTP
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return null;
  const direct = str.match(/\b(\d{4,8})\b/);
  return direct?.[1] || null;
}

function collectOtpCandidates(obj, out = [], parentKey = "") {
  if (obj == null) return out;
  if (/date|time|timestamp|created_at|updated_at|expires/i.test(parentKey)) return out;
  if (typeof obj === "string") {
    out.push(obj);
    return out;
  }
  if (typeof obj === "number") {
    if (/otp|code|token|verification|value/i.test(parentKey)) out.push(String(obj));
    return out;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) collectOtpCandidates(item, out, parentKey);
    return out;
  }
  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      if (/date|time|timestamp|created_at|updated_at|expires/i.test(key)) continue;
      if (/otp|code|token|verification/i.test(key)) out.push(value);
      collectOtpCandidates(value, out, key);
    }
  }
  return out;
}

async function parseJsonResponse(response) {
  try {
    return JSON.parse(await readExternalResponse(response));
  } catch {
    return null;
  }
}

function appendQuery(endpoint, params) {
  const query = new URLSearchParams(params);
  return endpoint + (endpoint.includes("?") ? "&" : "?") + query.toString();
}

module.exports = { extractOtpCode, collectOtpCandidates, parseJsonResponse, appendQuery };