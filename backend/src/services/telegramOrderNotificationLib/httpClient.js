/**
 * Gửi HTTP POST (fetch + fallback https), timeout, IPv4 ưu tiên.
 */

const https = require("https");
const dns = require("dns");
const logger = require("../../utils/logger");
const { HTTP_TIMEOUT_MS } = require("./constants");
const TRANSIENT_FETCH_ERROR_CODES = new Set([
  "ABORT_ERR",
  "UND_ERR_ABORTED",
  "UND_ERR_CONNECT_TIMEOUT",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
]);

/**
 * Agent truyền `options` có thể chứa localAddress, port… — spread vào dns.lookup
 * gây lỗi trên một số bản Node/Windows (ERR_INVALID_IP_ADDRESS: undefined).
 * Chỉ forward các field dns.lookup hỗ trợ.
 */
const dnsLookupOpts = (options, overrides) => {
  const out = { ...overrides };
  if (options && typeof options === "object") {
    if (options.hints != null) out.hints = options.hints;
    if (options.verbatim != null) out.verbatim = options.verbatim;
  }
  return out;
};

const preferIpv4Lookup = (hostname, options, cb) => {
  if (typeof hostname !== "string" || !hostname.trim()) {
    process.nextTick(() => cb(new TypeError("Invalid hostname for DNS lookup")));
    return;
  }
  const tryCb = (err, address, family) => {
    if (err) {
      cb(err);
      return;
    }
    if (address == null || address === "") {
      cb(new Error("DNS lookup returned no address"));
      return;
    }
    cb(null, String(address), Number(family) || 4);
  };

  dns.lookup(hostname, dnsLookupOpts(options, { family: 4, all: false }), (err, address, family) => {
    if (err || address == null || address === "") {
      return dns.lookup(hostname, dnsLookupOpts(options, { all: false }), tryCb);
    }
    tryCb(null, address, family);
  });
};

const getErrorCode = (err) =>
  String(err?.code || err?.cause?.code || "")
    .trim()
    .toUpperCase();

const getErrorMessage = (err) =>
  [err?.message, err?.cause?.message].filter(Boolean).join(" | ");

const isTransientFetchError = (err, timeoutSignal) => {
  const code = getErrorCode(err);
  const message = getErrorMessage(err);

  return (
    timeoutSignal?.aborted === true ||
    err?.name === "AbortError" ||
    err?.name === "TimeoutError" ||
    TRANSIENT_FETCH_ERROR_CODES.has(code) ||
    /fetch failed/i.test(message) ||
    /aborted due to timeout/i.test(message) ||
    /timed out/i.test(message) ||
    /socket hang up/i.test(message) ||
    /network is unreachable/i.test(message)
  );
};

/**
 * POST body qua https.request với keepAlive và IPv4.
 */
const sendWithHttps = (
  url,
  payload,
  headers = { "Content-Type": "application/json" }
) =>
  new Promise((resolve, reject) => {
    const body = typeof payload === "string" ? payload : JSON.stringify(payload);
    const urlObj = new URL(url);

    const req = https.request(
      {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: `${urlObj.pathname}${urlObj.search}`,
        method: "POST",
        headers: {
          ...headers,
          "Content-Length": Buffer.byteLength(body),
        },
        agent: new https.Agent({ keepAlive: true, lookup: preferIpv4Lookup }),
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          const status = res.statusCode || 0;
          if (status >= 400) {
            const err = new Error(`Request failed with status ${status}`);
            err.status = status;
            err.body = responseBody;
            reject(err);
            return;
          }
          resolve(responseBody);
        });
      }
    );

    req.setTimeout(HTTP_TIMEOUT_MS, () => {
      const timeoutError = new Error(`Request timed out after ${HTTP_TIMEOUT_MS}ms`);
      timeoutError.code = "ETIMEDOUT";
      req.destroy(timeoutError);
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });

/**
 * POST JSON; dùng fetch nếu có, fallback sendWithHttps khi lỗi tạm thời.
 */
const postJson = async (url, data) => {
  const payload = JSON.stringify(data);
  const headers = { "Content-Type": "application/json" };

  const timeoutSignal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(HTTP_TIMEOUT_MS)
      : undefined;

  if (typeof fetch === "function") {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: payload,
        signal: timeoutSignal,
      });
      if (!res.ok) {
        const err = new Error(`Request failed with status ${res.status}`);
        err.status = res.status;
        err.body = await res.text().catch(() => "");
        throw err;
      }
      return await res.text();
    } catch (err) {
      const code = getErrorCode(err);
      if (!isTransientFetchError(err, timeoutSignal)) {
        throw err;
      }
      logger.warn("[Order][Telegram] Fetch failed, retrying with https client", {
        name: err?.name,
        code,
        status: err?.status,
        message: err?.message,
      });
    }
  }

  return sendWithHttps(url, payload, headers);
};

module.exports = {
  sendWithHttps,
  postJson,
  isTransientFetchError,
};
