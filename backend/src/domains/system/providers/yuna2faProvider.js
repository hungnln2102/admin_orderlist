const { requestProviderApi } = require("./providerRequest");
const { readExternalResponse } = require("@/utils/safeExternalRequest");
const { parseJsonResponse } = require("./otpProviderUtils");

const yunaSessionCache = new Map();

async function getYuna2FaSession(config, timeoutMs = 10000) {
  const cacheKey = config.service_key || config.base_url;
  const now = Date.now();
  const cachedSession = yunaSessionCache.get(cacheKey);
  if (cachedSession?.token && cachedSession.expiresAt > now) {
    return cachedSession;
  }

  const pageResponse = await requestProviderApi(config, {
    endpoint: config.endpoints?.session,
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
 * Luồng Yuna 2FA Center (mmo.yunagrp.com/2fa/):
 * - Tra cứu theo đơn hàng (order_code) -> LẤY DANH SÁCH TÀI KHOẢN (items)
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

    const form = new URLSearchParams({ action: "get_order", order_code: query });

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
    if (!response.ok) return { extra_fields: [], error: `Yuna Check HTTP ${response.status}` };

    const data = await parseJsonResponse(response);
    if (!data) return { otp: null, extra_fields: [] };

    const extraFields = [];
    const items = Array.isArray(data.items) ? data.items : [];
    const accounts = items.map(({ name, account_user, group, expires_at_str }) => ({
      name,
      account_user: typeof account_user === "string" ? account_user.trim() : undefined,
      group,
      expires_at_str,
    }));
    const [primaryItem] = accounts;
    if (primaryItem) {
      if (primaryItem.account_user) {
        extraFields.push({ key: "account_email", label: "Email Tài Khoản", value: primaryItem.account_user, path: "items[0].account_user" });
      }
      if (primaryItem.group) {
        extraFields.push({ key: "product_plan", label: "Gói Dịch Vụ", value: String(primaryItem.group), path: "items[0].group" });
      }
      if (primaryItem.expires_at_str) {
        extraFields.push({ key: "expires_at", label: "Hạn Sử Dụng", value: String(primaryItem.expires_at_str), path: "items[0].expires_at_str" });
      }
    }

    return { extra_fields: extraFields, raw_data: { items: accounts } };
  } catch (err) {
    return { otp: null, extra_fields: [], error: err.message };
  }
}

module.exports = { fetchYunaAccountOrder };
