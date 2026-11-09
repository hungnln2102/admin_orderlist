const { requestProviderApi } = require("./providerRequest");
const { extractOtpCode, collectOtpCandidates, parseJsonResponse, appendQuery } = require("./otpProviderUtils");

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
  const config = configuredConfig; if (!config) throw new Error("Ades provider configuration is missing.");
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

module.exports = { fetchOtpFromFixAdes };
