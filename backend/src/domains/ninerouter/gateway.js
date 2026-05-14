const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const logger = require("../../utils/logger");
const { getBaseUrl, getApiKey, getTimeoutMs } = require("./config");

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
async function proxyToNinerouter(req, res) {
  const base = getBaseUrl();
  const targetUrl = `${base}${req.url}`;

  const headers = new Headers();
  const key = getApiKey();
  if (key) {
    headers.set("Authorization", `Bearer ${key}`);
  }

  const method = req.method.toUpperCase();
  const hasJsonBody =
    req.body != null &&
    typeof req.body === "object" &&
    !Buffer.isBuffer(req.body) &&
    method !== "GET" &&
    method !== "HEAD";

  if (hasJsonBody) {
    headers.set("Content-Type", "application/json");
  } else if (req.headers["content-type"]) {
    headers.set("Content-Type", String(req.headers["content-type"]));
  }

  /** @type {RequestInit} */
  const init = {
    method,
    headers,
    redirect: "manual",
  };

  const timeoutMs = getTimeoutMs();
  if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) {
    init.signal = AbortSignal.timeout(timeoutMs);
  }

  if (hasJsonBody) {
    init.body = JSON.stringify(req.body);
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (err) {
    logger.warn("[ninerouter] upstream fetch failed", {
      targetUrl,
      message: err.message,
    });
    if (!res.headersSent) {
      return res.status(502).json({
        error: "Không kết nối được tới 9Router",
        detail: err.message,
      });
    }
    return undefined;
  }

  const ct = upstream.headers.get("content-type") || "";
  const streamLike =
    ct.includes("text/event-stream") ||
    ct.includes("application/x-ndjson") ||
    ct.includes("ndjson");

  if (upstream.body && streamLike) {
    res.status(upstream.status);
    if (ct) res.setHeader("Content-Type", ct);
    const cache = upstream.headers.get("cache-control");
    if (cache) res.setHeader("Cache-Control", cache);
    try {
      await pipeline(Readable.fromWeb(upstream.body), res);
    } catch (err) {
      if (!res.writableEnded) {
        logger.warn("[ninerouter] stream pipeline error", { message: err.message });
      }
    }
    return undefined;
  }

  const buf = Buffer.from(await upstream.arrayBuffer());
  res.status(upstream.status);
  if (ct) res.setHeader("Content-Type", ct);

  if (ct.includes("application/json")) {
    try {
      const json = JSON.parse(buf.toString("utf8"));
      return res.json(json);
    } catch {
      return res.type("application/json").send(buf);
    }
  }

  return res.send(buf);
}

module.exports = {
  proxyToNinerouter,
};
