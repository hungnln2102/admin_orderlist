/**
 * Gửi HTTP POST (fetch + fallback https), timeout, IPv4 ưu tiên.
 */

const https = require("https");
const dns = require("dns");
const logger = require("../../utils/logger");
const { HTTP_TIMEOUT_MS } = require("./constants");

const preferIpv4Lookup = (hostname, options, cb) =>
  dns.lookup(hostname, { ...options, family: 4, all: false }, (err, address, family) => {
    if (err || !address) {
      return dns.lookup(hostname, { ...options, all: false }, cb);
    }
    cb(null, address, family);
  });

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
      req.destroy(new Error(`Request timed out after ${HTTP_TIMEOUT_MS}ms`));
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
      const code = err?.code || err?.cause?.code;
      const isTransient =
        err?.name === "AbortError" ||
        code === "ETIMEDOUT" ||
        code === "EAI_AGAIN" ||
        code === "ENOTFOUND" ||
        code === "ECONNRESET" ||
        /fetch failed/i.test(err?.message || "");
      if (!isTransient) {
        throw err;
      }
      logger.warn("[Order][Telegram] Fetch failed, retrying with https client", {
        code,
        status: err?.status,
      });
    }
  }

  return sendWithHttps(url, payload, headers);
};

module.exports = {
  sendWithHttps,
  postJson,
};
