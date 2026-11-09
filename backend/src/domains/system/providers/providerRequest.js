const { assertSafeExternalUrl, fetchSafeExternal } = require("@/utils/safeExternalRequest");

function joinUrl(baseUrl, endpoint) {
  const normalizedBase = String(baseUrl || "").replace(/\/+$/, "");
  const normalizedEndpoint = String(endpoint || "").replace(/^\/+/, "");
  if (/^(https?:)?\/\//i.test(normalizedEndpoint)) throw new Error("Endpoint must be a relative path.");
  return normalizedEndpoint ? normalizedBase + "/" + normalizedEndpoint : normalizedBase;
}

async function requestProviderApi(config, { method = "GET", body = null, endpoint = "", headers: extraHeaders = {}, signal = null, timeoutMs = 12_000 } = {}) {
  const targetUrl = joinUrl(config?.base_url, endpoint);
  await assertSafeExternalUrl(targetUrl);
  const headers = { Accept: "application/json, text/plain, */*", "User-Agent": "Admin-Orderlist-V2/2.0", ...extraHeaders };
  const auth = config?.auth_config || {};
  const token = auth.token || auth.defaultToken || auth.api_key;
  if (token && !headers.Authorization) headers.Authorization = "Bearer " + token;
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, Number(timeoutMs) || 12_000);
  if (signal) { if (signal.aborted) abort(); else signal.addEventListener("abort", abort, { once: true }); }
  try {
    const request = { method: String(method).toUpperCase(), headers, signal: controller.signal };
    if (body != null) {
      if (body instanceof URLSearchParams || typeof body === "string") { if (!headers["Content-Type"]) headers["Content-Type"] = "application/x-www-form-urlencoded"; request.body = body; }
      else { if (!headers["Content-Type"]) headers["Content-Type"] = "application/json"; request.body = JSON.stringify(body); }
    }
    return await fetchSafeExternal(targetUrl, request);
  } finally { clearTimeout(timer); if (signal) signal.removeEventListener("abort", abort); }
}
module.exports = { requestProviderApi };
