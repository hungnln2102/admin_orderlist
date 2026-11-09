const { readExternalResponse } = require("@/utils/safeExternalRequest");

function extractOtpCode(raw) {
  if (raw == null) return null;
  const direct = String(raw).match(/\b(\d{4,8})\b/);
  return direct?.[1] || null;
}

function collectOtpCandidates(obj, out = [], parentKey = "") {
  if (obj == null) return out;
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