/**
 * otpProviderService.js (V2)
 * 
 * Bộ xử lý lấy mã OTP từ các API dịch vụ bên thứ 3 bằng native fetch (Node.js 18+):
 * - HDSD API (https://otp.hdsd.net)
 * - TinyHost Temp Mail (https://tinyhost.shop)
 * - Fix Ades Support GPM (https://api-2026-02.ades.support)
 * - Yuna 2FA & Scraper (https://hub.yunagrp.com/2fa/)
 * - Generic Webmail (Tmail, Generator.email)
 */

const { getConfigByKey, requestConfiguredApi } = require("./externalApiConfigService");
const { readExternalResponse } = require("@/utils/safeExternalRequest");

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
    if (/otp|code|token|verification|value/i.test(parentKey)) {
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
      if (/otp|code|token|verification/i.test(key)) {
        out.push(value);
      }
      collectOtpCandidates(value, out, key);
    }
  }
  return out;
}

/**
 * 1. Lấy OTP từ HDSD (otp.hdsd.net)
 */
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

async function fetchOtpFromHdsd(email) {
  const config = { base_url: "https://otp.hdsd.net", ...((await getConfigByKey("otp_hdsd")) || {}) };
  const response = await requestConfiguredApi(config, { method: "POST", endpoint: config.endpoints?.get_otp || "/get_otp_api", body: { email }, timeoutMs: Number(config.auth_config?.timeoutMs) || 10_000 });
  if (!response.ok) throw new Error("HDSD returned HTTP " + response.status + ".");
  const data = await parseJsonResponse(response);
  const rows = Array.isArray(data) ? data : (data?.data || data?.mails || []);
  for (const row of rows) {
    const code = extractOtpCode(row?.value ?? row?.otp ?? row?.code);
    if (code) return code;
  }
  return collectOtpCandidates(data).map(extractOtpCode).find(Boolean) || null;
}

async function fetchOtpFromTinyHost(email) {
  const [user, domain] = String(email || "").split("@");
  if (!user || !domain) throw new Error("Email không hợp lệ để tra cứu TinyHost.");
  const config = { base_url: "https://tinyhost.shop", ...((await getConfigByKey("tinyhost")) || {}) };
  const timeoutMs = Number(config.auth_config?.timeoutMs) || 15_000;
  const listEndpoint = appendQuery("/api/email/" + encodeURIComponent(domain) + "/" + encodeURIComponent(user) + "/", { limit: "10" });
  const response = await requestConfiguredApi(config, { endpoint: listEndpoint, timeoutMs });
  if (!response.ok) throw new Error("TinyHost returned HTTP " + response.status + ".");
  const data = await parseJsonResponse(response) || {};
  for (const item of data.emails || []) {
    const directCode = extractOtpCode(item.subject);
    if (directCode) return directCode;
    const detailResponse = await requestConfiguredApi(config, { endpoint: "/api/email/" + encodeURIComponent(domain) + "/" + encodeURIComponent(user) + "/" + encodeURIComponent(item.id), timeoutMs });
    if (!detailResponse.ok) continue;
    const detail = await parseJsonResponse(detailResponse);
    const code = extractOtpCode(detail?.body || detail?.html_body);
    if (code) return code;
  }
  return null;
}

async function fetchOtpFromFixAdes(email) {
  const config = { base_url: "https://api-2026-02.ades.support", ...((await getConfigByKey("fix_ades")) || {}) };
  const endpoint = appendQuery(config.endpoints?.read_otp || "/mail/read-otp-gpm", { email });
  const response = await requestConfiguredApi(config, { endpoint, headers: { "User-Agent": "Mozilla/5.0" }, timeoutMs: Number(config.auth_config?.timeoutMs) || 10_000 });
  if (!response.ok) throw new Error("Fix Ades returned HTTP " + response.status + ".");
  const data = await parseJsonResponse(response);
  const directCode = extractOtpCode(data?.data?.otp || data?.data?.code);
  return directCode || collectOtpCandidates(data).map(extractOtpCode).find(Boolean) || null;
}

async function fetchOtpFromYuna(email) {
  const config = { base_url: "https://hub.yunagrp.com/2fa/", ...((await getConfigByKey("yuna_2fa")) || {}) };
  const timeoutMs = Number(config.auth_config?.timeoutMs) || 10_000;
  let token = config.auth_config?.defaultToken || "";
  const pageResponse = await requestConfiguredApi(config, { headers: { "User-Agent": "Mozilla/5.0" }, timeoutMs });
  if (pageResponse.ok) {
    const html = await readExternalResponse(pageResponse);
    const match = html.match(/<meta\s+name=["']api-token["']\s+content=["']([^"']+)["']/i);
    if (match?.[1]) token = match[1].trim();
  }
  const response = await requestConfiguredApi(config, { endpoint: appendQuery(config.endpoints?.order_info || "/order_info", { search: email }), headers: token ? { "X-API-Token": token } : {}, timeoutMs });
  if (!response.ok) return null;
  const data = await parseJsonResponse(response);
  const item = (data?.items || []).find((entry) => String(entry.name || "").toLowerCase().includes(String(email).toLowerCase()));
  return extractOtpCode(item?.code);
}
function getValueByPath(obj, path) {
  if (!obj || !path) return undefined;
  const normalized = String(path).trim().replace(/\[(\w+)\]/g, ".$1").replace(/^\./, "");
  const keys = normalized.split(".");
  let curr = obj;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (curr == null) return undefined;
    if (Array.isArray(curr) && !/^\d+$/.test(key)) {
      curr = curr[0]?.[key];
    } else {
      curr = curr[key];
    }
  }
  return curr;
}

/**
 * Gọi API linh hoạt theo cấu hình tùy chỉnh và trích xuất dữ liệu theo field_mapping
 */
async function fetchOtpFromDynamicConfig(config, email) {
  if (!config || !config.base_url) return { otp: null, extra_fields: [] };

  const endpoint = config.endpoints?.get_otp || config.endpoints?.read_otp || "";
  const authConfig = config.auth_config || {};
  const fieldMapping = Array.isArray(config.field_mapping) ? config.field_mapping : [];
  try {
    let res;
    if (authConfig.method === "POST" || config.endpoints?.method === "POST") {
      res = await requestConfiguredApi(config, { method: "POST", body: { email }, endpoint });
    } else {
      const query = endpoint.includes("?") ? "&" : "?";
      res = await requestConfiguredApi(config, { method: "GET", endpoint: `${endpoint}${query}email=${encodeURIComponent(email)}` });
    }

    if (!res.ok) return { otp: null, extra_fields: [] };

    const data = await parseJsonResponse(res);
    if (!data) return { otp: null, extra_fields: [] };

    let foundOtp = null;
    const extraFields = [];

    // 1. Trích xuất theo danh sách field_mapping người dùng đã cấu hình
    if (fieldMapping.length > 0) {
      for (const field of fieldMapping) {
        const val = getValueByPath(data, field.path);
        if (val !== undefined && val !== null) {
          const valStr = String(val);
          extraFields.push({
            key: field.key || field.label,
            label: field.label || field.key,
            value: valStr,
            path: field.path,
          });

          if (field.key === "otp" || field.is_primary || /otp|code|mã/i.test(field.label)) {
            const extracted = extractOtpCode(valStr);
            if (extracted && !foundOtp) foundOtp = extracted;
          }
        }
      }
    }

    // 2. Fallback quét tự động nếu chưa có OTP
    if (!foundOtp) {
      const candidates = collectOtpCandidates(data);
      for (const c of candidates) {
        const code = extractOtpCode(c);
        if (code) {
          foundOtp = code;
          break;
        }
      }
    }

    return { otp: foundOtp, extra_fields: extraFields, raw_data: data };
  } catch (err) {
    return { otp: null, extra_fields: [], error: err.message };
  }
}

/**
 * Hàm điều phối chung: Probe OTP cho bất kỳ email và dịch vụ nào
 */
async function probeOtpForEmail({ email, serviceKey = "otp_hdsd" }) {
  if (!email || !String(email).includes("@")) {
    throw new Error("Vui lòng cung cấp email hợp lệ (vd: user@domain.com).");
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const startTime = Date.now();
  let otp = null;
  let sourceUsed = serviceKey;
  let extraFields = [];

  switch (serviceKey) {
    case "otp_hdsd":
      otp = await fetchOtpFromHdsd(cleanEmail);
      break;
    case "tinyhost":
      otp = await fetchOtpFromTinyHost(cleanEmail);
      break;
    case "fix_ades":
      otp = await fetchOtpFromFixAdes(cleanEmail);
      break;
    case "yuna_2fa":
    case "yuna_mail":
      otp = await fetchOtpFromYuna(cleanEmail);
      break;
    default: {
      const customConfig = await getConfigByKey(serviceKey);
      if (customConfig) {
        const dynamicResult = await fetchOtpFromDynamicConfig(customConfig, cleanEmail);
        otp = dynamicResult.otp;
        extraFields = dynamicResult.extra_fields || [];
      } else {
        otp = await fetchOtpFromHdsd(cleanEmail).catch(() => null);
        if (!otp) otp = await fetchOtpFromFixAdes(cleanEmail).catch(() => null);
        if (!otp) otp = await fetchOtpFromTinyHost(cleanEmail).catch(() => null);
      }
      break;
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    email: cleanEmail,
    service_key: sourceUsed,
    otp: otp || null,
    found: Boolean(otp),
    duration_ms: durationMs,
    extra_fields: extraFields,
    message: otp ? `Đã tìm thấy mã OTP [${otp}] thành công!` : "Chưa có thư mới hoặc chưa lấy được mã OTP trong hộp thư.",
  };
}

module.exports = {
  extractOtpCode,
  getValueByPath,
  fetchOtpFromHdsd,
  fetchOtpFromTinyHost,
  fetchOtpFromFixAdes,
  fetchOtpFromYuna,
  probeOtpForEmail,
};
