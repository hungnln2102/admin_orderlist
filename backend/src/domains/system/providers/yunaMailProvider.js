const { requestProviderApi } = require("./providerRequest");
const { fetchSafeExternal, readExternalResponse } = require("@/utils/safeExternalRequest");
const { extractOtpCode, parseJsonResponse } = require("./otpProviderUtils");

const yunaRulesCache = new Map();

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
    const mailConfig = configuredConfig; if (!mailConfig) throw new Error("Yuna Mail provider configuration is missing.");
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

module.exports = { fetchOtpFromYunaMail };
