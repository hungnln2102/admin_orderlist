const { requestProviderApi } = require("./providerRequest");
const { extractOtpCode, parseJsonResponse } = require("./otpProviderUtils");

const yunaSessionCache = new Map();

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

  const config = configuredConfig; if (!config) throw new Error("Yuna 2FA provider configuration is missing.");
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

module.exports = { fetchYunaAccountOrder };
