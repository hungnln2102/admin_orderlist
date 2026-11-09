/**
 * otpProviderService.js (V2)
 * 
 * Bộ xử lý lấy mã OTP từ các API dịch vụ bên thứ 3 bằng native fetch (Node.js 18+):
 * - TinyHost Temp Mail (https://tinyhost.shop)
 * - Fix Ades Support GPM (https://api-2026-02.ades.support)
 * - Yuna 2FA & Scraper (https://hub.yunagrp.com/2fa/)
 */

const { requestProviderApi } = require("../providers/providerRequest");
const { getProviderConfig } = require("../providers/registry");
const { fetchSafeExternal, readExternalResponse } = require("@/utils/safeExternalRequest");
const { extractOtpCode, collectOtpCandidates, parseJsonResponse, appendQuery } = require("../providers/otpProviderUtils");
const { fetchOtpFromTinyHost } = require("../providers/tinyhostProvider");
const { fetchOtpFromImap } = require("../providers/imap");

async function resolveOtpConfig(config, serviceKey, baseUrl) {
  return config || getProviderConfig(serviceKey) || { base_url: baseUrl };
}

/* â”€â”€ Ades Support Auto-Token & Only-OTP Cache â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const adesSessionCache = new Map();

async function getAdesSessionToken(config, timeoutMs = 10_000) {
  const cacheKey = config.service_key || config.base_url;
  const now = Date.now();
  const cachedSession = adesSessionCache.get(cacheKey);
  if (cachedSession?.token && cachedSession.expiresAt > now + 30_000) {
    return cachedSession.token;
  }

  try {
    const tokenRes = await requestProviderApi(config, {
      method: "POST",
      endpoint: config.endpoints?.auth_token || "/ades-support/auth/token",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeoutMs,
    });

    if (!tokenRes.ok) return null;
    const data = await parseJsonResponse(tokenRes);
    const token = data?.data?.token;
    const expiresIn = Number(data?.data?.expiresIn) || 600;

    if (token) {
      adesSessionCache.set(cacheKey, {
        token,
        expiresAt: now + expiresIn * 1000,
      });
      return token;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchOtpFromFixAdes(email, { config: configuredConfig, includeDetails = false } = {}) {
  if (!email) return null;
  const cleanEmail = String(email).trim().toLowerCase();
  const config = await resolveOtpConfig(configuredConfig, "ades", "https://api-2026-02.ades.support");
  const timeoutMs = Number(config.auth_config?.timeoutMs) || 12_000;

  // 1. Tự động lấy/tái sử dụng Bearer Token (hạn 10 phút, không cần nhập thủ công)
  let token = await getAdesSessionToken(config, timeoutMs);

  // 2. Gọi endpoint chuyên dụng Only-OTP (/ades-support/only-otp)
  const endpointPath = config.endpoints?.only_otp || "/ades-support/only-otp";
  const endpointWithQuery = appendQuery(endpointPath, { email: cleanEmail });

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "X-Feature-Code": "only-otp",
    "X-App-Key": "ades-otp-mail",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response = await requestProviderApi(config, {
    method: "GET",
    endpoint: endpointWithQuery,
    headers,
    timeoutMs,
  });

  // Nếu token hết hạn (401), tự động xóa cache và thử cấp mới token 1 lần
  if (response.status === 401) {
    adesSessionCache.delete(config.service_key || config.base_url);
    token = await getAdesSessionToken(config, timeoutMs);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      response = await requestProviderApi(config, {
        method: "GET",
        endpoint: endpointWithQuery,
        headers,
        timeoutMs,
      });
    }
  }

  // 3. Fallback sang endpoint cũ nếu endpoint mới trả mã lỗi khác
  if (!response.ok) {
    const fallbackEndpoint = appendQuery(config.endpoints?.read_otp || "/mail/read-otp-gpm", { email: cleanEmail });
    const fallbackRes = await requestProviderApi(config, { endpoint: fallbackEndpoint, headers: { "User-Agent": "Mozilla/5.0" }, timeoutMs }).catch(() => null);
    if (fallbackRes?.ok) {
      const fbData = await parseJsonResponse(fallbackRes);
      const fbOtp = extractOtpCode(fbData?.data?.otp || fbData?.data?.code);
      if (includeDetails) return { otp: fbOtp, rawData: fbData };
      return fbOtp;
    }
    throw new Error("Fix Ades returned HTTP " + response.status + ".");
  }

  const data = await parseJsonResponse(response);
  // Định dạng chuẩn: { status: 200, success: true, data: { success: true, otp: "699211", emailSubject: "...", emailDate: "..." } }
  const directCode = extractOtpCode(data?.data?.otp || data?.data?.code || data?.otp);
  const otp = directCode || collectOtpCandidates(data).map(extractOtpCode).find(Boolean) || null;
  if (includeDetails) {
    return { otp, rawData: data };
  }
  return otp;
}

/* â”€â”€ YunaGRP Polite & Anti-Spam Caches â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
// 1. Session Cache cho Yuna 2FA Center (hub.yunagrp.com/2fa/) - TTL 10 phút
const yunaSessionCache = new Map();

// 2. Rules Cache cho Yuna Mail (mail.yunagrp.com) - TTL 15 phút
const yunaRulesCache = new Map();

/**
 * Lấy token và cookie phiên làm việc từ https://hub.yunagrp.com/2fa/
 * Lưu cache 10 phút để không gửi request liên tục làm phiền máy chủ đối tác.
 */
async function getYuna2FaSession(config, timeoutMs = 10000) {
  const cacheKey = config.service_key || config.base_url;
  const now = Date.now();
  const cachedSession = yunaSessionCache.get(cacheKey);
  if (cachedSession?.token && cachedSession.expiresAt > now) {
    return cachedSession;
  }

  const pageResponse = await requestProviderApi(config, {
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

  const session = {
    token,
    cookie: cookiePart,
    expiresAt: now + 10 * 60 * 1000,
  };
  yunaSessionCache.set(cacheKey, session);

  return session;
}

/**
 * 4. Luồng Yuna 2FA Center (hub.yunagrp.com/2fa/):
 * - Tra cứu theo đơn hàng (order_code) -> LẤY DANH SÁCH TÀI KHOẢN (items)
 * - Hoặc tra cứu mã 2FA từ secret (get_manual)
 */
async function fetchYunaAccountOrder(queryInput, { config: configuredConfig } = {}) {
  if (!queryInput) return { otp: null, extra_fields: [] };
  const query = String(queryInput).trim();

  const config = await resolveOtpConfig(configuredConfig, "yuna_2fa", "https://hub.yunagrp.com/2fa/");
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

    const response = await requestProviderApi(config, {
      method: "POST",
      endpoint: config.endpoints?.get_otp || config.endpoints?.path || "",
      body: form.toString(),
      headers,
      timeoutMs,
    });

    if (response.status === 403) {
      // Invalidate session cache if 403
      yunaSessionCache.delete(config.service_key || config.base_url);
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
 * 5. Luồng Yuna Mail Hub & Aggregator (mail.yunagrp.com):
 * - Tự động tải routing rules từ https://mail.yunagrp.com/admin.php?public=rules (Cache 15 phút)
 * - Tích hợp 5 API gửi thẳng JSON (api_getadobe, api_hdsd, api_local, api_mailtm, api_trackmail)
 * - Tích hợp 2 link webmail chuyển tiếp (generator.email, tmail)
 */
async function callYunaProxy(config, endpoint, email, timeoutMs = 10_000, includeDetails = false) {
  try {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Yuna-Version": "Â©2026 YunaGRP Panel V3.12.1",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };
    const response = await requestProviderApi(config, {
      method: "POST",
      endpoint,
      body: { email },
      headers,
      timeoutMs,
    });
    if (!response.ok) return includeDetails ? { otp: null, rawData: null } : null;
    const payload = await parseJsonResponse(response);
    if (!payload || payload.status !== true || !payload.data) return includeDetails ? { otp: null, rawData: payload } : null;

    const data = payload.data;
    const latest = data.latest;
    let directCode = null;
    if (latest) {
      directCode = extractOtpCode(latest.value || latest.extracted_code || latest.code || latest.otp);
    }

    if (!directCode && Array.isArray(data.history) && data.history.length > 0) {
      for (const item of data.history) {
        const c = extractOtpCode(item.value || item.extracted_code || item.code || item.otp || item.subject);
        if (c) {
          directCode = c;
          break;
        }
      }
    }

    if (includeDetails) {
      return { otp: directCode, rawData: payload };
    }
    return directCode;
  } catch {
    return includeDetails ? { otp: null, rawData: null } : null;
  }
}

async function fetchOtpFromWebmail(targetUrl, timeoutMs = 10_000) {
  try {
    const res = await fetchSafeExternal(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const html = await readExternalResponse(res);
    // 1. Tìm theo ngữ cảnh xác minh mã OTP 6 số
    const contextualMatch = html.match(/(?:adobe|verification\s*code|mã\s*xác\s*minh|mã\s*xác\s*thực|mã\s*otp|otp\s*code)[^0-9]{1,50}(\d{6})/i);
    if (contextualMatch?.[1]) return contextualMatch[1];
    // 2. Tìm thẻ chứa class hoặc id liên quan tới otp/code
    const tagMatch = html.match(/(?:class|id)=["'][^"']*(?:otp|code|verify)[^"']*["'][^>]*>[\s\r\n]*(\d{4,8})[\s\r\n]*</i);
    if (tagMatch?.[1]) return tagMatch[1];
    return null;
  } catch {
    return null;
  }
}

async function fetchOtpFromYunaMail(email, { config: configuredConfig, includeDetails = false } = {}) {
  if (!email || !String(email).includes("@")) return null;
  const cleanEmail = String(email).trim().toLowerCase();
  const domain = cleanEmail.split("@")[1];
  const now = Date.now();

  try {
    // 1. Lấy danh sách rules với cache 15 phút (chống gọi liên tục làm phiền Yuna)
    const mailConfig = await resolveOtpConfig(configuredConfig, "yuna_mail", "https://mail.yunagrp.com");
    const cacheKey = mailConfig.service_key || mailConfig.base_url;
    const cachedRules = yunaRulesCache.get(cacheKey);
    let rules = cachedRules?.rules;
    if (!rules || cachedRules.expiresAt < now) {
      const rulesRes = await requestProviderApi(mailConfig, {
        endpoint: mailConfig.endpoints?.rules || "/admin.php?public=rules",
        headers: { "User-Agent": "Mozilla/5.0" },
        timeoutMs: 10_000,
      });

      if (rulesRes.ok) {
        const rulesData = await parseJsonResponse(rulesRes);
        if (rulesData?.success && Array.isArray(rulesData.rules)) {
          rules = rulesData.rules;
          yunaRulesCache.set(cacheKey, { rules, expiresAt: now + 15 * 60 * 1000 });
        }
      }
    }

    const matchedRule = (rules || []).find((r) => r.domain === domain && r.enabled !== false);
    const action = matchedRule ? matchedRule.action : "api_local";

    let resObj = null;

    // Rẽ nhánh tuần tự theo chỉ đạo của Master:
    if (action === "api_getadobe") {
      // 1. GetAdobe: gọi POST /api-getadobe.php
      resObj = await callYunaProxy(mailConfig, mailConfig.endpoints?.api_getadobe || "/api-getadobe.php", cleanEmail, 10_000, true);
    } else if (action === "api_hdsd") {
      // 2. HDSD: gọi POST /api-hdsd.php, nếu chưa có thì fallback sang
      resObj = await callYunaProxy(mailConfig, mailConfig.endpoints?.api_hdsd || "/api-hdsd.php", cleanEmail, 10_000, true);

    } else if (action === "api_local") {
      // 3. Local NNM: gọi POST /api-nnm.php
      resObj = await callYunaProxy(mailConfig, mailConfig.endpoints?.api_local || "/api-nnm.php", cleanEmail, 10_000, true);
    } else if (action === "api_mailtm") {
      // 4. MailTM: gọi POST /api-mailtm.php
      resObj = await callYunaProxy(mailConfig, mailConfig.endpoints?.api_mailtm || "/api-mailtm.php", cleanEmail, 10_000, true);
    } else if (action === "api_trackmail") {
      // 5. Outlook/Hotmail: gọi POST /outlook-api.php
      resObj = await callYunaProxy(mailConfig, mailConfig.endpoints?.api_trackmail || "/outlook-api.php", cleanEmail, 10_000, true);
    } else if (action === "redirect_email" || action === "redirect_fixed") {
      // 6 & 7. Chuyển hướng Webmail (generator.email & tmail)
      const targetTemplate = matchedRule?.target || "";
      const targetUrl = targetTemplate
        .replace(/\{email\}/g, cleanEmail)
        .replace(/\{email_encoded\}/g, encodeURIComponent(cleanEmail))
        .replace(/\{domain\}/g, domain);

      if (targetUrl) {
        const otpCode = await fetchOtpFromWebmail(targetUrl);
        resObj = { otp: otpCode, rawData: { target_url: targetUrl, otp: otpCode } };
      }
    } else {
      // Fallback: Thử gọi api-getadobe.php
      resObj = await callYunaProxy(mailConfig, "/api-getadobe.php", cleanEmail, 10_000, true);
    }

    if (includeDetails) {
      return { otp: resObj?.otp || null, rawData: resObj?.rawData || null };
    }
    return resObj?.otp || null;
  } catch {
    return includeDetails ? { otp: null, rawData: null } : null;
  }
}


/**
 * 6. Luồng Viva Rocky Portal (https://vivarocky.in):
 * - Bóc tách 3 chức năng:
 *   1) household: POST /household.php (user_email) -> Link TV / Household Netflix
 *   2) six_digit: POST /six_digit_login.php (user_email) -> Mã OTP 6 số
 *   3) signin_code: POST /signin_code.php (user_email, access_code) -> Mã đăng nhập nhanh
 */
async function fetchOtpFromVivaRocky(queryInput, { config: configuredConfig, serviceKey = 'vivarocky_household', type = 'household', accessCode = '', includeDetails = false } = {}) {
  if (!queryInput) return { otp: null, extra_fields: [] };

  let email = String(queryInput).trim();
  let code = accessCode;
  if (email.includes('|')) {
    const parts = email.split('|');
    email = parts[0].trim();
    if (!code) code = parts[1].trim();
  } else if (email.includes(':') && !email.startsWith('http')) {
    const parts = email.split(':');
    email = parts[0].trim();
    if (!code) code = parts[1].trim();
  }

  const config = await resolveOtpConfig(configuredConfig, serviceKey, 'https://vivarocky.in');
  const resolvedType = config.auth_config?.operation || type;
  const timeoutMs = Number(config.auth_config?.timeoutMs) || 15_000;

  let endpoint = '';
  // Nếu base_url chưa chứa .php thì mới cộng thêm endpoint
  if (!config.base_url.includes('.php')) {
    if (resolvedType === 'six_digit') endpoint = config.endpoints?.six_digit || '/six_digit_login.php';
    else if (resolvedType === 'signin_code') endpoint = config.endpoints?.signin || '/signin_code.php';
    else endpoint = config.endpoints?.household || '/household.php';
  }

  const finalAccessCode = code || config.auth_config?.access_code || config.auth_config?.token || 'mvrk56';
  const params = new URLSearchParams();
  if (resolvedType === 'household') params.append('email', email);
  params.append('user_email', email);
  if (resolvedType === 'signin_code' && finalAccessCode) {
    params.append('access_code', finalAccessCode);
  }

  try {
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    };

    const response = await requestProviderApi(config, {
      method: 'POST',
      endpoint,
      body: params.toString(),
      headers,
      timeoutMs
    });

    if (!response.ok) {
      throw new Error('Viva Rocky returned HTTP ' + response.status);
    }

    const html = await readExternalResponse(response);

    const errorMatch = html.match(/<div[^>]*class=["'][^"']*error-box[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    let errorMessage = null;
    if (errorMatch) {
      errorMessage = errorMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    }

    const nftokenMatch = html.match(/href=["']([^"']*[?&](?:nftoken|messageGuid)=[^"']+)["']/i);
    const buttonTextMatch = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]{0,400}?(?:Get\s+Code|Lấy\s+mã|Lay\s+ma)[\s\S]{0,200}?<\/a>/i);
    const travelVerifyMatch = html.match(/href=["'](https?:\/\/[^"']*\/(?:account\/travel\/verify|travel\/verify)[^"']*)["']/i);
    const linkMatch =
      nftokenMatch ||
      buttonTextMatch ||
      travelVerifyMatch ||
      html.match(/href=["'](https?:\/\/[^"']*household[^"']*)["']/i) ||
      html.match(/href=["'](https?:\/\/[^"']*netflix[^"']*)["']/i) ||
      html.match(/window\.location\.href\s*=\s*["'](https?:\/\/[^"']+)["']/i);
    const netflixLink = resolvedType === 'household' && linkMatch?.[1]
      ? linkMatch[1].replace(/&amp;/gi, '&').replace(/&#38;/g, '&').replace(/&#x26;/gi, '&').trim()
      : null;

    let foundOtp = null;
    if (resolvedType !== 'household') {
      const successMatch = html.match(/<div[^>]*class=["'][^"']*(?:success-box|result-box|code-box)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (successMatch) {
        foundOtp = extractOtpCode(successMatch[1]);
      }
      if (!foundOtp) {
        const contextualMatch = html.match(/(?:netflix|mÃƒÂ£|code|otp|login\s*code)[^0-9]{1,50}(\d{6})/i);
        if (contextualMatch?.[1]) {
          foundOtp = contextualMatch[1];
        }
      }
      if (!foundOtp && resolvedType === 'signin_code') {
        const textContent = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ');
        const signInCodeMatch = textContent.match(/enter\s+this\s+code\s+to\s+sign\s+in[\s\S]{0,120}?\b(\d{4,8})\b/i);
        if (signInCodeMatch?.[1]) {
          foundOtp = signInCodeMatch[1];
        }
      }
      if (!foundOtp && resolvedType === 'six_digit') {
        const allCodes = html.match(/\b\d{6}\b/g) || [];
        foundOtp = allCodes.find(c => !html.includes('style.css?v=' + c)) || null;
      }
    }

    const extraFields = [];
    if (netflixLink) {
      extraFields.push({
        key: 'netflix_link',
        label: 'Link Cập Nhật Netflix',
        value: netflixLink,
        path: 'netflix_link'
      });
    }
    if (foundOtp) {
      extraFields.push({
        key: 'otp',
        label: 'Mã OTP / 6 Số',
        value: String(foundOtp),
        path: 'otp'
      });
    }
    if (errorMessage && !netflixLink && !foundOtp) {
      extraFields.push({
        key: 'server_message',
        label: 'Thông Báo Máy Chủ',
        value: errorMessage,
        path: 'error_box'
      });
    }

    const result = {
      otp: foundOtp,
      netflix_link: netflixLink,
      extra_fields: extraFields,
      error_message: errorMessage,
      raw_data: { html_snippet: html.slice(0, 1000) }
    };

    if (includeDetails) return result;
    return result;
  } catch (err) {
    return {
      otp: null,
      extra_fields: [],
      error: err.message
    };
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
      res = await requestProviderApi(config, { method: "POST", body: { email }, endpoint });
    } else {
      const query = endpoint.includes("?") ? "&" : "?";
      res = await requestProviderApi(config, { method: "GET", endpoint: `${endpoint}${query}email=${encodeURIComponent(email)}` });
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
async function fetch2FaFromWarehouse(queryInput) {
  if (!queryInput) return { otp: null, extra_fields: [], message: "Vui lòng nhập email hoặc mã đơn hàng cần tra cứu." };
  const cleanInput = String(queryInput).trim();
  const { db, TABLES } = require("@/db");
  const totpService = require("./totpService");

  try {
    // 1. Tìm trong warehouse.account_slots kết hợp accounts
    let matched = await db(TABLES.ACCOUNT_SLOTS)
      .join(TABLES.ACCOUNTS, `${TABLES.ACCOUNT_SLOTS}.account_id`, `${TABLES.ACCOUNTS}.id`)
      .where(function () {
        this.whereILike(`${TABLES.ACCOUNTS}.account_username`, cleanInput)
          .orWhereILike(`${TABLES.ACCOUNT_SLOTS}.backup_email`, cleanInput)
          .orWhereILike(`${TABLES.ACCOUNT_SLOTS}.customer`, cleanInput)
          .orWhere(`${TABLES.ACCOUNT_SLOTS}.id_order`, cleanInput)
          .orWhere(`${TABLES.ACCOUNTS}.id_order`, cleanInput);
      })
      .select(
        `${TABLES.ACCOUNTS}.account_username`,
        `${TABLES.ACCOUNTS}.note as acc_note`,
        `${TABLES.ACCOUNT_SLOTS}.two_fa`,
        `${TABLES.ACCOUNT_SLOTS}.backup_email`,
        `${TABLES.ACCOUNT_SLOTS}.service_note`
      )
      .first();

    // 2. Nếu chưa thấy trong slots, tìm trực tiếp trong accounts
    if (!matched) {
      const acc = await db(TABLES.ACCOUNTS)
        .where(function () {
          this.whereILike("account_username", cleanInput)
            .orWhere("id_order", cleanInput);
        })
        .first();
      if (acc) {
        matched = {
          account_username: acc.account_username,
          acc_note: acc.note,
          two_fa: null,
        };
      }
    }

    if (!matched) {
      return {
        otp: null,
        found: false,
        message: `Không tìm thấy tài khoản [${cleanInput}] trong Kho Hàng.`,
      };
    }

    // 3. Trích xuất Secret Key 2FA
    let secretKey = matched.two_fa;
    if (!secretKey && matched.acc_note) {
      const m = matched.acc_note.match(/(?:2fa|totp|secret)[:\s]+([a-z2-7\s]{16,64})/i);
      if (m) secretKey = m[1];
    }

    if (!secretKey) {
      return {
        otp: null,
        found: false,
        message: `Tài khoản [${matched.account_username || cleanInput}] trong kho chưa được cài mã 2FA.`,
      };
    }

    // 4. Sinh mã OTP qua totpService
    const totpRes = totpService.generateTotp(secretKey);
    return {
      otp: totpRes.code,
      found: true,
      extra_fields: [
        { key: "account_username", label: "Tài khoản kho", value: matched.account_username || cleanInput, path: "account_username" },
        { key: "remaining_seconds", label: "Thời gian còn lại", value: `${totpRes.remainingSeconds}s`, path: "remainingSeconds" },
        { key: "expires_at", label: "Hết hạn lúc", value: totpRes.expiresAt, path: "expiresAt" },
      ],
      message: `Đã tìm thấy khóa 2FA trong kho và sinh mã OTP [${totpRes.code}] thành công!`,
    };
  } catch (err) {
    return {
      otp: null,
      found: false,
      message: `Lỗi tra cứu kho: ${err.message}`,
    };
  }
}

function normalizeExecutionResult(result) {
  if (typeof result === "string") return { otp: result || null, extra_fields: [], raw_data: { otp: result || null } };
  return {
    otp: result?.otp || null,
    extra_fields: Array.isArray(result?.extra_fields) ? result.extra_fields : [],
    raw_data: result?.raw_data || result?.rawData || result || null,
    error_message: result?.error_message || result?.error || null,
  };
}

async function executeInternalTotp(input) {
  const totpService = require("./totpService");
  try {
    const result = totpService.generateTotp(input);
    return normalizeExecutionResult({
      otp: result.code,
      raw_data: result,
      extra_fields: [
        { key: "remaining_seconds", label: "Thời gian còn lại", value: `${result.remainingSeconds}s`, path: "remainingSeconds" },
        { key: "expires_at", label: "Hết hạn lúc", value: result.expiresAt, path: "expiresAt" },
      ],
    });
  } catch (error) {
    return normalizeExecutionResult({ error: error.message });
  }
}

async function executeWarehouse2Fa(input) {
  return normalizeExecutionResult(await fetch2FaFromWarehouse(input));
}

const OTP_EXECUTION_HANDLERS = Object.freeze({
  GENERIC_HTTP: async (config, input) => normalizeExecutionResult(await fetchOtpFromDynamicConfig(config, input)),
  MAILBOX_REST: async (config, input) => normalizeExecutionResult(await fetchOtpFromTinyHost(input, { config, includeDetails: true })),
  AUTHENTICATED_OTP: async (config, input) => normalizeExecutionResult(await fetchOtpFromFixAdes(input, { config, includeDetails: true })),
  YUNA_2FA: async (config, input) => normalizeExecutionResult(await fetchYunaAccountOrder(input, { config })),
  YUNA_MAIL: async (config, input) => normalizeExecutionResult(await fetchOtpFromYunaMail(input, { config, includeDetails: true })),
  VIVAROCKY_HTML: async (config, input, options) => normalizeExecutionResult(await fetchOtpFromVivaRocky(input, {
    config,
    serviceKey: config.service_key,
    type: config.auth_config?.operation || options?.subType || options?.type || "household",
    accessCode: options?.accessCode || config.auth_config?.access_code || "",
    includeDetails: true,
  })),
  INTERNAL_TOTP: async (_config, input) => executeInternalTotp(input),
  INTERNAL_WAREHOUSE_2FA: async (_config, input) => executeWarehouse2Fa(input),
  INTERNAL_IMAP: async (_config, input) => normalizeExecutionResult(await fetchOtpFromImap(input, { includeDetails: true })),
});

async function executeOtpConfig(config, input, options = {}) {
  const executionMode = String(config?.execution_mode || "GENERIC_HTTP").trim().toUpperCase();
  const handler = OTP_EXECUTION_HANDLERS[executionMode];
  if (!handler) throw new Error(`Unsupported OTP execution mode '${executionMode}' for service '${config?.service_key || "unknown"}'.`);
  return handler(config, input, options);
}

async function probeOtpForEmail({ email, serviceKey, ...options }) {
  if (!email) throw new Error("Vui lòng cung cấp email hoặc mã đơn hàng cần kiểm tra.");

  if (!serviceKey) throw new Error("OTP_PROVIDER_NOT_FOUND: service_key is required.");
  const queryInput = String(email).trim();
  const serviceConfig = getProviderConfig(serviceKey);
  if (!serviceConfig) throw new Error(`OTP_PROVIDER_NOT_FOUND: no active OTP configuration for service_key '${serviceKey}'.`);

  const executionMode = String(serviceConfig.execution_mode || "GENERIC_HTTP").trim().toUpperCase();
  const acceptsNonEmailInput = ["INTERNAL_TOTP", "INTERNAL_WAREHOUSE_2FA", "YUNA_2FA"].includes(executionMode);
  if (!acceptsNonEmailInput && !queryInput.includes("@")) {
    throw new Error("Vui lòng cung cấp email hợp lệ (vd: user@domain.com).");
  }

  const cleanInput = acceptsNonEmailInput ? queryInput : queryInput.toLowerCase();
  const startedAt = Date.now();
  const executionResult = await executeOtpConfig(serviceConfig, cleanInput, options);
  const extraFields = [...executionResult.extra_fields];
  const configuredFields = Array.isArray(serviceConfig.field_mapping) ? serviceConfig.field_mapping : [];

  if (executionResult.raw_data && configuredFields.length > 0) {
    for (const field of configuredFields) {
      if (field.is_primary || field.key === "otp") continue;
      if (extraFields.some((item) => item.path === field.path || item.key === field.key)) continue;
      const rawValue = getValueByPath(executionResult.raw_data, field.path);
      if (rawValue === undefined || rawValue === null || rawValue === "") continue;
      let value = typeof rawValue === "object" ? JSON.stringify(rawValue) : String(rawValue);
      if (/date|time|created_at/i.test(field.key) || /date|time/i.test(field.path)) {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed) && !/^\d{4,8}$/.test(value)) value = new Date(parsed).toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" });
      }
      extraFields.push({ key: field.key || field.path, label: field.label || field.key, value, path: field.path });
    }
  }

  const found = Boolean(executionResult.otp || extraFields.some((field) => field.key !== "server_message"));
  return {
    success: true,
    email: queryInput,
    service_key: serviceConfig.service_key,
    otp: executionResult.otp || null,
    found,
    duration_ms: Date.now() - startedAt,
    extra_fields: extraFields,
    message: found
      ? (executionResult.otp ? `Đã tìm thấy mã OTP [${executionResult.otp}] thành công!` : `Đã lấy thông tin tài khoản thành công! (${extraFields.length} trường)`)
      : (executionResult.error_message || "Chưa có thư mới hoặc chưa lấy được mã OTP trong hộp thư."),
  };
}

module.exports = {
  fetchOtpFromVivaRocky,
  extractOtpCode,
  getValueByPath,
  fetchOtpFromTinyHost,
  fetchOtpFromFixAdes,
  fetchYunaAccountOrder,
  fetchOtpFromYunaMail,
  fetchOtpFromYuna,
  executeOtpConfig,
  probeOtpForEmail,
};
