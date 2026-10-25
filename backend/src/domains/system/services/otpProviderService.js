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
async function fetchOtpFromHdsd(email) {
  const config = (await getConfigByKey("otp_hdsd")) || {};
  const authConfig = config.auth_config || {};
  const baseUrl = config.base_url || "https://otp.hdsd.net";
  const endpoint = config.endpoints?.get_otp || "/get_otp_api";
  const token = authConfig.token || "";
  const timeoutMs = Number(authConfig.timeoutMs) || 10000;

  const url = `${baseUrl.replace(/\/+$/, "")}${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ email }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HDSD trả về mã HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json().catch(() => null);
    if (!data) return null;

    let rows = [];
    if (Array.isArray(data)) rows = data;
    else if (data?.data && Array.isArray(data.data)) rows = data.data;
    else if (data?.mails && Array.isArray(data.mails)) rows = data.mails;

    if (rows.length > 0) {
      for (const row of rows) {
        const code = extractOtpCode(row?.value ?? row?.otp ?? row?.code);
        if (code) return code;
      }
    }

    const candidates = collectOtpCandidates(data);
    for (const c of candidates) {
      const code = extractOtpCode(c);
      if (code) return code;
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 2. Lấy OTP từ TinyHost (tinyhost.shop)
 */
async function fetchOtpFromTinyHost(email) {
  const [user, domain] = String(email || "").split("@");
  if (!user || !domain) throw new Error("Email không hợp lệ để tra cứu TinyHost.");

  const config = (await getConfigByKey("tinyhost")) || {};
  const baseUrl = config.base_url || "https://tinyhost.shop";
  const timeoutMs = Number(config.auth_config?.timeoutMs) || 15000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const listUrl = `${baseUrl.replace(/\/+$/, "")}/api/email/${encodeURIComponent(domain)}/${encodeURIComponent(user)}/?limit=10`;
    const res = await fetch(listUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`TinyHost trả về HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json().catch(() => ({}));
    const emails = data?.emails || [];
    if (emails.length === 0) return null;

    for (const item of emails) {
      const rawSubject = item.subject || "";
      const directCode = extractOtpCode(rawSubject);
      if (directCode) return directCode;

      try {
        const detailUrl = `${baseUrl.replace(/\/+$/, "")}/api/email/${encodeURIComponent(domain)}/${encodeURIComponent(user)}/${item.id}`;
        const detailRes = await fetch(detailUrl, { signal: controller.signal });
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          const body = detailData?.body || detailData?.html_body || "";
          const bodyCode = extractOtpCode(body);
          if (bodyCode) return bodyCode;
        }
      } catch {}
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 3. Lấy OTP từ Fix Ades Support (GPM API)
 */
async function fetchOtpFromFixAdes(email) {
  const config = (await getConfigByKey("fix_ades")) || {};
  const baseUrl = config.base_url || "https://api-2026-02.ades.support";
  const endpoint = config.endpoints?.read_otp || "/mail/read-otp-gpm";
  const timeoutMs = Number(config.auth_config?.timeoutMs) || 10000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${baseUrl.replace(/\/+$/, "")}${endpoint}?email=${encodeURIComponent(email)}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!res.ok) throw new Error(`Fix Ades trả về HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json().catch(() => null);
    if (data?.data && typeof data.data === "object") {
      const code = extractOtpCode(data.data.otp || data.data.code);
      if (code) return code;
    }

    const candidates = collectOtpCandidates(data);
    for (const c of candidates) {
      const code = extractOtpCode(c);
      if (code) return code;
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 4. Lấy OTP từ Yuna 2FA
 */
async function fetchOtpFromYuna(email) {
  const config = (await getConfigByKey("yuna_2fa")) || {};
  const baseUrl = config.base_url || "https://hub.yunagrp.com/2fa/";
  const timeoutMs = Number(config.auth_config?.timeoutMs) || 10000;
  const defaultToken = config.auth_config?.defaultToken || "d7c79d236dcb94c2ce0bfb3a10bf68d71ec02d08cfd07882beb4fe9152fb85cb";

  let token = defaultToken;
  try {
    const htmlRes = await fetch(baseUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (htmlRes.ok) {
      const htmlText = await htmlRes.text();
      const match = htmlText.match(/<meta\s+name=["']api-token["']\s+content=["']([^"']+)["']/i);
      if (match?.[1]) token = match[1].trim();
    }
  } catch {}

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const apiUrl = `${baseUrl.replace(/\/+$/, "")}/order_info?search=${encodeURIComponent(email)}`;
    const res = await fetch(apiUrl, {
      headers: { "X-API-Token": token },
      signal: controller.signal,
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      const items = data?.items || [];
      const matchItem = items.find((it) => String(it.name || "").toLowerCase().includes(String(email).toLowerCase()));
      if (matchItem?.code) {
        return extractOtpCode(matchItem.code);
      }
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lấy giá trị từ object theo json path (vd: data.otp hoặc items[0].code)
 */
function getValueByPath(obj, path) {
  if (!obj || !path) return undefined;
  const normalized = path.replace(/\[(\w+)\]/g, ".$1").replace(/^\./, "");
  const keys = normalized.split(".");
  let curr = obj;
  for (const key of keys) {
    if (curr == null) return undefined;
    curr = curr[key];
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

    const data = await res.json().catch(() => null);
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
  fetchOtpFromHdsd,
  fetchOtpFromTinyHost,
  fetchOtpFromFixAdes,
  fetchOtpFromYuna,
  probeOtpForEmail,
};
