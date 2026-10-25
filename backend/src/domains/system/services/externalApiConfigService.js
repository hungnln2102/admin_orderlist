const { db, TABLES } = require("@/db");
const { assertSafeExternalUrl, fetchSafeExternal, readExternalResponse } = require("@/utils/safeExternalRequest");

const TABLE = TABLES.EXTERNAL_API_CONFIGS;
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();
const cacheTimestamps = new Map();
const SECRET_KEY_PATTERN = /token|api[_-]?key|secret|password|authorization/i;

function parseJson(value, fallback) {
  if (typeof value !== "string") return value || fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function isSecretKey(key) {
  return SECRET_KEY_PATTERN.test(String(key));
}

function redactSecrets(value, key = "") {
  if (isSecretKey(key)) return "";
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactSecrets(entryValue, entryKey)]));
  }
  return value;
}

function mergeAuthConfig(existing, incoming) {
  const result = { ...(existing || {}) };
  for (const [key, value] of Object.entries(incoming || {})) {
    if (isSecretKey(key) && (value === "" || value === null || value === undefined)) continue;
    result[key] = value;
  }
  return result;
}

function parseConfigRow(row) {
  return {
    ...row,
    endpoints: parseJson(row.endpoints, {}),
    auth_config: parseJson(row.auth_config, {}),
    field_mapping: parseJson(row.field_mapping, []),
  };
}

function toClientConfig(config) {
  return { ...config, auth_config: redactSecrets(config.auth_config) };
}

function clearCache(serviceKey = null) {
  if (serviceKey) {
    cache.delete(serviceKey);
    cacheTimestamps.delete(serviceKey);
    return;
  }
  cache.clear();
  cacheTimestamps.clear();
}

async function getInternalConfigById(id) {
  const row = await db(TABLE).where("id", id).first();
  return row ? parseConfigRow(row) : null;
}

async function getAllConfigs() {
  const rows = await db(TABLE).select("*").orderBy("id", "asc");
  return rows.map((row) => toClientConfig(parseConfigRow(row)));
}

async function getConfigById(id) {
  const config = await getInternalConfigById(id);
  return config ? toClientConfig(config) : null;
}

async function getConfigByKey(serviceKey) {
  const now = Date.now();
  if (cache.has(serviceKey) && now - (cacheTimestamps.get(serviceKey) || 0) < CACHE_TTL_MS) return cache.get(serviceKey);

  const row = await db(TABLE).where("service_key", serviceKey).where("is_active", true).first();
  if (!row) return null;

  const config = parseConfigRow(row);
  cache.set(serviceKey, config);
  cacheTimestamps.set(serviceKey, now);
  return config;
}

async function validateBaseUrl(baseUrl) {
  const safeUrl = await assertSafeExternalUrl(baseUrl);
  return safeUrl.toString().replace(/\/$/, "");
}

async function createConfig(data) {
  if (!data?.service_key || !data?.service_name || !data?.base_url) {
    throw new Error("service_key, service_name and base_url are required.");
  }

  const serviceKey = String(data.service_key).trim();
  const existing = await db(TABLE).where("service_key", serviceKey).first();
  if (existing) throw new Error(`Service key '${serviceKey}' already exists.`);

  const [inserted] = await db(TABLE).insert({
    service_key: serviceKey,
    service_name: String(data.service_name).trim(),
    category: data.category || "OTP",
    description: data.description || "",
    base_url: await validateBaseUrl(data.base_url),
    endpoints: JSON.stringify(data.endpoints || {}),
    auth_config: JSON.stringify(data.auth_config || {}),
    field_mapping: JSON.stringify(data.field_mapping || []),
    is_active: data.is_active !== false,
    created_at: db.fn.now(),
    updated_at: db.fn.now(),
  }).returning("*");

  clearCache();
  return toClientConfig(parseConfigRow(inserted));
}

async function updateConfig(id, data) {
  const existing = await getInternalConfigById(id);
  if (!existing) throw new Error(`Configuration #${id} was not found.`);

  const updateData = { updated_at: db.fn.now() };
  if (data.service_name !== undefined) updateData.service_name = String(data.service_name).trim();
  if (data.category !== undefined) updateData.category = String(data.category).trim();
  if (data.description !== undefined) updateData.description = String(data.description);
  if (data.base_url !== undefined) updateData.base_url = await validateBaseUrl(data.base_url);
  if (data.endpoints !== undefined) updateData.endpoints = JSON.stringify(data.endpoints || {});
  if (data.auth_config !== undefined) updateData.auth_config = JSON.stringify(mergeAuthConfig(existing.auth_config, data.auth_config));
  if (data.field_mapping !== undefined) updateData.field_mapping = JSON.stringify(data.field_mapping || []);
  if (data.is_active !== undefined) updateData.is_active = Boolean(data.is_active);

  await db(TABLE).where("id", id).update(updateData);
  clearCache(existing.service_key);
  return getConfigById(id);
}

async function deleteConfig(id) {
  const existing = await getInternalConfigById(id);
  if (!existing) throw new Error(`Configuration #${id} was not found.`);
  await db(TABLE).where("id", id).delete();
  clearCache(existing.service_key);
  return { success: true, message: `Deleted configuration #${id}.` };
}

function buildAuthHeaders(authConfig = {}) {
  const headers = {};
  const token = authConfig.token || authConfig.defaultToken || authConfig.api_key;
  if (!token) return headers;
  if (authConfig.type === "api_key_header") headers["X-API-Key"] = token;
  else headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function requestConfiguredApi(config, { method = "GET", body = null, endpoint = "" } = {}) {
  const endpointPath = String(endpoint || "").trim();
  if (endpointPath.startsWith("http:") || endpointPath.startsWith("https:") || endpointPath.startsWith("//")) {
    throw new Error("Endpoint must be a relative path.");
  }
  const baseUrl = await validateBaseUrl(config.base_url);
  const fullUrl = endpointPath ? `${baseUrl}/${endpointPath.replace(/^\/+/, "")}` : baseUrl;
  const headers = {
    Accept: "application/json, text/plain, */*",
    "User-Agent": "Admin-Orderlist-V2/2.0",
    ...buildAuthHeaders(config.auth_config),
  };
  const requestMethod = String(method || "GET").toUpperCase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const options = { method: requestMethod, headers, signal: controller.signal };
    if (["POST", "PUT", "PATCH"].includes(requestMethod) && body !== null && body !== undefined) {
      headers["Content-Type"] = "application/json";
      options.body = typeof body === "string" ? body : JSON.stringify(body);
    }
    return await fetchSafeExternal(fullUrl, options);
  } finally {
    clearTimeout(timer);
  }
}

async function testApiConnection(id) {
  const config = await getInternalConfigById(id);
  if (!config) throw new Error(`Configuration #${id} was not found.`);

  const startedAt = Date.now();
  try {
    const response = await requestConfiguredApi(config);
    return {
      success: true,
      reachable: response.ok,
      status: response.status,
      statusText: response.statusText || String(response.status),
      responseTimeMs: Date.now() - startedAt,
      contentType: response.headers.get("content-type") || "",
    };
  } catch (error) {
    return { success: false, reachable: false, error: error.message, responseTimeMs: Date.now() - startedAt };
  }
}

function extractJsonPaths(value, path = "", depth = 0) {
  if (depth > 5 || value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.slice(0, 5).flatMap((item, index) => extractJsonPaths(item, `${path}[${index}]`, depth + 1));
  if (typeof value !== "object") return [{ path, type: typeof value, sample: isSecretKey(path) ? "[REDACTED]" : String(value).slice(0, 120), is_potential_otp: /otp|code|verify/i.test(path) }];
  return Object.entries(value).flatMap(([key, entry]) => extractJsonPaths(entry, path ? `${path}.${key}` : key, depth + 1));
}

async function analyzeEndpoint({ configId, method, body } = {}) {
  if (!Number.isInteger(configId) || configId <= 0) throw new Error("A valid saved configuration is required.");
  const config = await getInternalConfigById(configId);
  if (!config) throw new Error(`Configuration #${configId} was not found.`);

  const endpoint = config.endpoints?.get_otp || config.endpoints?.read_otp || config.endpoints?.path || "";
  const requestMethod = method || config.endpoints?.method || "GET";
  const startedAt = Date.now();
  try {
    const response = await requestConfiguredApi(config, { method: requestMethod, body, endpoint });
    const text = await readExternalResponse(response);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw_text: text.slice(0, 5000) };
    }
    return {
      success: true,
      status: response.status,
      statusText: response.statusText || String(response.status),
      latency_ms: Date.now() - startedAt,
      contentType: response.headers.get("content-type") || "",
      detected_fields: extractJsonPaths(data),
    };
  } catch (error) {
    return { success: false, status: 0, statusText: error.message, latency_ms: Date.now() - startedAt, detected_fields: [] };
  }
}

module.exports = {
  analyzeEndpoint,
  clearCache,
  createConfig,
  deleteConfig,
  getAllConfigs,
  getConfigById,
  getConfigByKey,
  requestConfiguredApi,
  testApiConnection,
  updateConfig,
};
