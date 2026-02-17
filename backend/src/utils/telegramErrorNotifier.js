/**
 * Telegram Error Notifier
 * Sends error-level logs to a Telegram topic for real-time monitoring.
 * Each error = 1 concise message.
 */

const https = require("https");
const dns = require("dns");
const os = require("os");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const ERROR_TOPIC_ID = Number.parseInt(
  process.env.ERROR_TOPIC_ID || "6",
  10
);
const ENABLED =
  String(process.env.SEND_ERROR_NOTIFICATION || "true").toLowerCase() !== "false";

// Rate limiting: max 1 message per 2 seconds, queue up to 20
const RATE_LIMIT_MS = 2000;
const MAX_QUEUE = 20;
let queue = [];
let sending = false;
let lastSentAt = 0;

const preferIpv4Lookup = (hostname, options, cb) =>
  dns.lookup(hostname, { ...options, family: 4, all: false }, (err, address, family) => {
    if (err || !address) {
      return dns.lookup(hostname, { ...options, all: false }, cb);
    }
    cb(null, address, family);
  });

const postToTelegram = (payload) =>
  new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: "api.telegram.org",
        port: 443,
        path: `/bot${BOT_TOKEN}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        agent: new https.Agent({ keepAlive: true, lookup: preferIpv4Lookup }),
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => resolve(data));
      }
    );
    req.setTimeout(10_000, () => {
      req.destroy(new Error("Telegram request timed out"));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });

/**
 * Build a concise error message for Telegram
 */
const buildErrorMessage = ({ message, source, url, method, stack, extra }) => {
  const timestamp = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const hostname = os.hostname();

  const lines = [
    `🚨 <b>${source === "frontend" ? "Frontend" : "Backend"} Error</b>`,
    `⏰ ${timestamp}`,
    `🖥 ${hostname}`,
  ];

  if (url) lines.push(`📍 ${method ? `${method} ` : ""}${url}`);
  if (message) lines.push(`💬 <code>${escapeHtml(truncate(message, 200))}</code>`);
  if (stack) lines.push(`📋 <pre>${escapeHtml(truncate(stack, 300))}</pre>`);
  if (extra) lines.push(`📎 ${escapeHtml(truncate(String(extra), 150))}`);

  return lines.join("\n");
};

const escapeHtml = (str) =>
  String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const truncate = (str, max) => {
  const s = String(str || "");
  return s.length > max ? `${s.slice(0, max)}...` : s;
};

const processQueue = async () => {
  if (sending || queue.length === 0) return;
  sending = true;

  while (queue.length > 0) {
    const now = Date.now();
    const wait = RATE_LIMIT_MS - (now - lastSentAt);
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
    }

    const text = queue.shift();
    try {
      const payload = {
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      };
      if (Number.isFinite(ERROR_TOPIC_ID)) {
        payload.message_thread_id = ERROR_TOPIC_ID;
      }
      await postToTelegram(payload);
      lastSentAt = Date.now();
    } catch (err) {
      // Silently fail - we don't want error reporting to cause more errors
      console.error("[ErrorNotifier] Failed to send:", err?.message);
    }
  }

  sending = false;
};

/**
 * Send an error notification to Telegram.
 * Non-blocking, fire-and-forget with rate limiting.
 *
 * @param {Object} opts
 * @param {string} opts.message - Error message
 * @param {string} [opts.source="backend"] - "backend" or "frontend"
 * @param {string} [opts.url] - Request URL (if applicable)
 * @param {string} [opts.method] - HTTP method (if applicable)
 * @param {string} [opts.stack] - Error stack trace
 * @param {string} [opts.extra] - Any additional info
 */
const notifyError = (opts = {}) => {
  if (!ENABLED || !BOT_TOKEN || !CHAT_ID) return;

  const text = buildErrorMessage(opts);

  if (queue.length >= MAX_QUEUE) {
    queue.shift(); // Drop oldest if queue is full
  }
  queue.push(text);
  processQueue();
};

module.exports = { notifyError };
