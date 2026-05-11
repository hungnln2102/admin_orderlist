/**
 * Gửi HTTP POST (fetch + fallback https), timeout, IPv4 ưu tiên.
 */

const https = require("https");
const { HTTP_TIMEOUT_MS } = require("./constants");
const { preferIpv4Lookup } = require("./dnsHelpers");
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
 * `payload` có thể là string (JSON đã stringify), object (auto JSON.stringify),
 * hoặc Buffer (đã đóng gói multipart sẵn → caller tự set Content-Type).
 */
const sendWithHttps = (
  url,
  payload,
  headers = { "Content-Type": "application/json" }
) =>
  new Promise((resolve, reject) => {
    let body;
    if (Buffer.isBuffer(payload)) {
      body = payload;
    } else if (typeof payload === "string") {
      body = payload;
    } else {
      body = JSON.stringify(payload);
    }
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
          "Content-Length": Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body),
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
 * POST JSON with one transport only.
 * Telegram sendMessage/sendPhoto is not idempotent; retrying the same payload
 * after a client timeout can create duplicate messages.
 */
const postJson = async (url, data) => {
  const payload = JSON.stringify(data);
  const headers = { "Content-Type": "application/json" };
  return sendWithHttps(url, payload, headers);
};

/**
 * POST multipart/form-data — caller đã build `body` (Buffer) + `headers` (gồm
 * Content-Type kèm boundary) qua `multipartBuilder.buildMultipartBody`.
 */
const postMultipart = async (url, body, headers) => {
  if (!Buffer.isBuffer(body)) {
    throw new TypeError("postMultipart: body must be a Buffer");
  }
  return sendWithHttps(url, body, headers);
};

module.exports = {
  sendWithHttps,
  postJson,
  postMultipart,
  isTransientFetchError,
};
