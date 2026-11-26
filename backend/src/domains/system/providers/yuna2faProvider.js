const { requestProviderApi } = require("./providerRequest");
const { readExternalResponse } = require("@/utils/safeExternalRequest");
const { parseJsonResponse } = require("./otpProviderUtils");

const yunaSessionCache = new Map();
const yunaReportLocks = new Map();
const yunaAcceptedReports = new Map();
const yunaReportReasons = new Set(["expired", "credentials", "otp", "inactive", "other"]);

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

async function requestYunaOrder(config, body, timeoutMs = Number(config.auth_config?.timeoutMs) || 12_000) {
  const session = await getYuna2FaSession(config, Number(config.auth_config?.timeoutMs) || 12_000);
  if (!session.token) throw new Error("Không thể lấy token xác thực từ Yuna 2FA.");
  const headers = {
    "X-API-Token": session.token,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  };
  if (session.cookie) headers.Cookie = session.cookie;
  const response = await requestProviderApi(config, {
    method: "POST",
    endpoint: config.endpoints?.get_otp || config.endpoints?.path || "",
    body,
    headers,
    timeoutMs,
  });
  if (response.status === 403) yunaSessionCache.delete(config.service_key || config.base_url);
  if (!response.ok) throw new Error(`Yuna Check HTTP ${response.status}`);
  return parseJsonResponse(response);
}

function yunaOrderKey(config, orderCode) {
  return JSON.stringify([config.service_key || config.base_url, orderCode]);
}

function getYunaReportStatus(item, key) {
  const reported = item.report_status || "none";
  if (reported !== "none") {
    yunaAcceptedReports.delete(key);
    return reported;
  }
  return yunaAcceptedReports.get(key)?.status || reported;
}

async function readYunaOrder(orderCode, config) {
  const body = new URLSearchParams({ action: "get_order", order_code: orderCode });
  const data = await requestYunaOrder(config, body.toString());
  if (data?.success !== true) throw new Error("Yuna không trả kết quả tra cứu tài khoản.");
  return Array.isArray(data.items) ? data.items : [];
}

async function fetchYunaAccountOrder(queryInput, { config, includePassword = false } = {}) {
  if (!queryInput) return { otp: null, extra_fields: [] };
  if (!config) throw new Error("Yuna 2FA provider configuration is missing.");
  const query = String(queryInput).trim();
  try {
    const extraFields = [];
    const items = await readYunaOrder(query, config);
    const key = yunaOrderKey(config, query);
    const accounts = items.map((item) => {
      const { name, account_user, account_pass, group, expires_at_str } = item;
      return {
        name: account_pass && typeof name === "string" && name.includes(account_pass) ? account_user : name,
        account_user: typeof account_user === "string" ? account_user.trim() : undefined,
        group,
        expires_at_str,
        report_status: getYunaReportStatus(item, key),
      };
    });
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

    const result = { extra_fields: extraFields, raw_data: { items: accounts } };
    if (includePassword && items.length === 1 && typeof items[0].account_pass === "string") {
      result.account_password = items[0].account_pass;
    }
    return result;
  } catch (err) {
    return { otp: null, extra_fields: [], error: err.message };
  }
}

function parseYunaReportReason(reason, details) {
  if (!yunaReportReasons.has(reason)) return null;
  const description = typeof details === "string" ? details.trim() : "";
  if (reason === "other" && (!description || description.length > 400)) return null;
  return { reason_code: reason, reason_detail: reason === "other" ? description : "" };
}

async function readSingleYunaReportAccount(orderCode, config) {
  const items = await readYunaOrder(orderCode, config);
  const [item] = items;
  if (items.length !== 1 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(item.account_user || "").trim()) ||
      typeof item.group !== "string" || typeof item.name !== "string" ||
      !Number.isInteger(item.item_index) || item.item_index < 0) {
    throw new Error("Yuna không trả tài khoản hợp lệ để báo lỗi.");
  }
  return item;
}

async function submitYunaReport(orderCode, reason, config, key) {
  const item = await readSingleYunaReportAccount(orderCode, config);
  const existing = getYunaReportStatus(item, key);
  if (existing !== "none") return existing;
  const form = new FormData();
  for (const [field, value] of Object.entries({
    action: "report_error",
    order_code: orderCode,
    group: item.group,
    name: item.name,
    item_index: item.item_index,
    ...reason,
    client_public_ip: "",
  })) form.append(field, value);

  const result = await requestYunaOrder(config, form, 45_000).catch(() => null);
  if (result?.success === true) {
    // The submit reply may arrive before the order lookup reflects its new status.
    const fallback = { status: result.auto_fulfilled ? "cooldown" : "adobe_renewing" };
    yunaAcceptedReports.set(key, fallback);
    const cooldownSeconds = Math.min(180, Math.max(3, Number(result.cooldown_remaining) || 180));
    setTimeout(() => {
      if (yunaAcceptedReports.get(key) === fallback) yunaAcceptedReports.delete(key);
    }, cooldownSeconds * 1000).unref();
  }
  const current = await readSingleYunaReportAccount(orderCode, config).catch(() => null);
  const status = current ? getYunaReportStatus(current, key) : yunaAcceptedReports.get(key)?.status;
  if (status && status !== "none") return status;
  throw new Error("Yuna chưa xác nhận yêu cầu báo lỗi.");
}

async function reportYunaAccountOrder(orderCode, { config, reason }) {
  const key = yunaOrderKey(config, orderCode);
  if (yunaReportLocks.has(key)) return yunaReportLocks.get(key);
  const request = submitYunaReport(orderCode, reason, config, key);
  yunaReportLocks.set(key, request);
  try {
    return await request;
  } finally {
    yunaReportLocks.delete(key);
  }
}

module.exports = { fetchYunaAccountOrder, parseYunaReportReason, reportYunaAccountOrder };
