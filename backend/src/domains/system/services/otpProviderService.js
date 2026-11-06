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

/* ── YunaGRP Polite & Anti-Spam Caches ────────────────────────── */
// 1. Session Cache cho Yuna 2FA Center (hub.yunagrp.com/2fa/) - TTL 10 phút
let yunaSessionCache = {
  token: null,
  cookie: null,
  expiresAt: 0,
};

// 2. Rules Cache cho Yuna Mail (mail.yunagrp.com) - TTL 15 phút
let yunaRulesCache = {
  rules: null,
  expiresAt: 0,
};

/**
 * Lấy token và cookie phiên làm việc từ https://hub.yunagrp.com/2fa/
 * Lưu cache 10 phút để không gửi request liên tục làm phiền máy chủ đối tác.
 */
async function getYuna2FaSession(config, timeoutMs = 10000) {
  const now = Date.now();
  if (yunaSessionCache.token && yunaSessionCache.expiresAt > now) {
    return yunaSessionCache;
  }

  const pageResponse = await requestConfiguredApi(config, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    timeoutMs,
  });

  if (!pageResponse.ok) {
    return { token: null, cookie: null };
  }

  const rawCookie = pageResponse.headers.get("set-cookie") || "";
  const cookiePart = rawCookie ? rawCookie.split(";")[0] : "";
  const html = await readExternalResponse(pageResponse);
  const match = html.match(/<meta\s+name=["']api-token["']\s+content=["']([^"']+)["']/i);
  const token = match?.[1] ? match[1].trim() : "";

  yunaSessionCache = {
    token,
    cookie: cookiePart,
    expiresAt: now + 10 * 60 * 1000, // 10 phút
  };

  return yunaSessionCache;
}

/**
 * 4. Luồng Yuna 2FA Center (hub.yunagrp.com/2fa/):
 * - Tra cứu theo đơn hàng (order_code) -> LẤY DANH SÁCH TÀI KHOẢN (items)
 * - Hoặc tra cứu mã 2FA từ secret (get_manual)
 */
async function fetchYunaAccountOrder(queryInput) {
  if (!queryInput) return { otp: null, extra_fields: [] };
  const query = String(queryInput).trim();

  const config = {
    base_url: "https://hub.yunagrp.com/2fa/",
    ...((await getConfigByKey("yuna_2fa")) || {}),
  };
  const timeoutMs = Number(config.auth_config?.timeoutMs) || 12_000;

  try {
    const session = await getYuna2FaSession(config, timeoutMs);
    if (!session.token) {
      return { otp: null, extra_fields: [], error: "Không thể lấy token xác thực từ Yuna 2FA." };
    }

    const form = new URLSearchParams();
    const isBase32Secret = /^[A-Z2-7]{16,32}$/i.test(query);

    if (isBase32Secret) {
      form.append("action", "get_manual");
      form.append("secret", query);
    } else {
      form.append("action", "get_order");
      form.append("order_code", query);
    }

    const headers = {
      "X-API-Token": session.token,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    };
    if (session.cookie) {
      headers["Cookie"] = session.cookie;
    }

    const response = await requestConfiguredApi(config, {
      method: "POST",
      body: form.toString(),
      headers,
      timeoutMs,
    });

    if (response.status === 403) {
      // Invalidate session cache if 403
      yunaSessionCache = { token: null, cookie: null, expiresAt: 0 };
    }

    const data = await parseJsonResponse(response);
    if (!data) return { otp: null, extra_fields: [] };

    let foundOtp = extractOtpCode(data.code) || null;
    const extraFields = [];

    // Nếu là get_manual: có code và time_left
    if (data.code) {
      extraFields.push({ key: "code", label: "Mã 2FA / OTP", value: String(data.code), path: "code" });
    }
    if (data.time_left !== undefined) {
      extraFields.push({ key: "time_left", label: "Thời gian còn lại (s)", value: String(data.time_left), path: "time_left" });
    }

    // Nếu là get_order: trả về danh sách tài khoản (items)
    if (Array.isArray(data.items) && data.items.length > 0) {
      extraFields.push({
        key: "items",
        label: "Danh Sách Tài Khoản",
        value: JSON.stringify(data.items),
        path: "items",
      });

      // Lấy tài khoản đầu tiên
      const primaryItem = data.items[0];
      if (primaryItem.name) {
        extraFields.push({ key: "account_email", label: "Email Tài Khoản", value: String(primaryItem.name), path: "items[0].name" });
      }
      if (primaryItem.group) {
        extraFields.push({ key: "product_plan", label: "Gói Dịch Vụ", value: String(primaryItem.group), path: "items[0].group" });
      }
      if (primaryItem.expires_at_str) {
        extraFields.push({ key: "expires_at", label: "Hạn Sử Dụng", value: String(primaryItem.expires_at_str), path: "items[0].expires_at_str" });
      }
      if (primaryItem.code && !foundOtp) {
        foundOtp = extractOtpCode(primaryItem.code);
        extraFields.push({ key: "otp", label: "Mã OTP 2FA", value: String(primaryItem.code), path: "items[0].code" });
      }
    }

    return { otp: foundOtp, extra_fields: extraFields, raw_data: data };
  } catch (err) {
    return { otp: null, extra_fields: [], error: err.message };
  }
}

/**
 * 5. Luồng Yuna Mail Rules & Scraper (mail.yunagrp.com):
 * - Tự động tải routing rules từ https://mail.yunagrp.com/admin.php?public=rules (Cache 15 phút)
 * - Với action api_local -> gọi https://mail.yunagrp.com/api.php?email={email}
 * - Với action api_hdsd -> chuyển tiếp sang HDSD
 */
async function fetchOtpFromYunaMail(email) {
  if (!email || !String(email).includes("@")) return null;
  const cleanEmail = String(email).trim().toLowerCase();
  const domain = cleanEmail.split("@")[1];
  const now = Date.now();

  try {
    // 1. Lấy danh sách rules với cache 15 phút (chống gọi liên tục làm phiền Yuna)
    let rules = yunaRulesCache.rules;
    if (!rules || yunaRulesCache.expiresAt < now) {
      const config = {
        base_url: "https://mail.yunagrp.com",
        ...((await getConfigByKey("yuna_mail")) || {}),
      };
      const rulesRes = await requestConfiguredApi(config, {
        endpoint: "/admin.php?public=rules",
        headers: { "User-Agent": "Mozilla/5.0" },
        timeoutMs: 10_000,
      });

      if (rulesRes.ok) {
        const rulesData = await parseJsonResponse(rulesRes);
        if (rulesData?.success && Array.isArray(rulesData.rules)) {
          rules = rulesData.rules;
          yunaRulesCache = { rules, expiresAt: now + 15 * 60 * 1000 };
        }
      }
    }

    const matchedRule = (rules || []).find((r) => r.domain === domain && r.enabled !== false);
    const action = matchedRule ? matchedRule.action : "api_local";

    if (action === "api_hdsd") {
      return await fetchOtpFromHdsd(cleanEmail);
    }

    // Mặc định hoặc api_local: Gọi API Mail Yuna
    const mailConfig = {
      base_url: "https://mail.yunagrp.com",
      ...((await getConfigByKey("yuna_mail")) || {}),
    };
    const response = await requestConfiguredApi(mailConfig, {
      endpoint: `/api.php?email=${encodeURIComponent(cleanEmail)}`,
      headers: { "User-Agent": "Mozilla/5.0" },
      timeoutMs: 10_000,
    });

    if (response.ok) {
      const data = await parseJsonResponse(response);
      const code = data?.data?.latest?.extracted_code || data?.otp || data?.code;
      if (code) return extractOtpCode(code);
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchOtpFromYuna(email) {
  const result = await fetchYunaAccountOrder(email);
  return result?.otp || null;
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
 * Hàm điều phối chung: Probe OTP hoặc thông tin tài khoản cho bất kỳ dịch vụ nào
 */
async function probeOtpForEmail({ email, serviceKey = "otp_hdsd" }) {
  if (!email) {
    throw new Error("Vui lòng cung cấp email hoặc mã đơn hàng cần kiểm tra.");
  }

  const queryInput = String(email).trim();
  if (serviceKey !== "yuna_2fa" && !queryInput.includes("@")) {
    throw new Error("Vui lòng cung cấp email hợp lệ (vd: user@domain.com).");
  }

  const cleanEmail = queryInput.toLowerCase();
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
    case "yuna_2fa": {
      const yunaRes = await fetchYunaAccountOrder(queryInput);
      otp = yunaRes.otp;
      extraFields = yunaRes.extra_fields || [];
      break;
    }
    case "yuna_mail": {
      otp = await fetchOtpFromYunaMail(cleanEmail);
      break;
    }
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

  let message = "";
  if (serviceKey === "yuna_2fa") {
    message = extraFields.length > 0
      ? `Đã lấy thông tin tài khoản thành công! (${extraFields.length} trường)`
      : (otp ? `Đã lấy mã 2FA [${otp}] thành công!` : "Không tìm thấy thông tin đơn hàng hoặc mã 2FA.");
  } else {
    message = otp
      ? `Đã tìm thấy mã OTP [${otp}] thành công!`
      : "Chưa có thư mới hoặc chưa lấy được mã OTP trong hộp thư.";
  }

  return {
    success: true,
    email: queryInput,
    service_key: sourceUsed,
    otp: otp || null,
    found: Boolean(otp || extraFields.length > 0),
    duration_ms: durationMs,
    extra_fields: extraFields,
    message,
  };
}

module.exports = {
  extractOtpCode,
  getValueByPath,
  fetchOtpFromHdsd,
  fetchOtpFromTinyHost,
  fetchOtpFromFixAdes,
  fetchYunaAccountOrder,
  fetchOtpFromYunaMail,
  fetchOtpFromYuna,
  probeOtpForEmail,
};
