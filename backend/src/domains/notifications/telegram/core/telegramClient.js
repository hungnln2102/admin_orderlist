/**
 * Core Telegram Client
 * Độc quyền gửi HTTP requests tới Telegram. Quản lý chung một Global Rate Limit Queue
 * để đảm bảo Bot không bao giờ bị block do spam (Đặc biệt khi vừa nổ đơn hàng vừa nổ lỗi).
 */

const https = require("https");
function getLogger() {
  return require("@/utils/logger");
}
const { HTTP_TIMEOUT_MS, TELEGRAM_BOT_TOKEN } = require("@/domains/notifications/telegram/core/constants");

const RATE_LIMIT_MS = 1500; // Giãn cách 1.5s giữa mỗi tin nhắn
const MAX_QUEUE = 300; // Ngăn rò rỉ bộ nhớ nếu mạng sập dài hạn

const queue = [];
let isSending = false;

const agent = new https.Agent({ keepAlive: true });

/**
 * Lõi gọi HTTP Request tới API Telegram
 */
function rawPostToTelegram(payload) {
  return new Promise((resolve, reject) => {
    if (!TELEGRAM_BOT_TOKEN) {
      return reject(new Error("Missing TELEGRAM_BOT_TOKEN"));
    }

    const isFormData = !!payload.getHeaders; // Duck typing cho FormData (để gửi ảnh QR)
    const headers = isFormData
      ? payload.getHeaders()
      : {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(JSON.stringify(payload)),
        };

    const req = https.request(
      {
        hostname: "api.telegram.org",
        port: 443,
        path: `/bot${TELEGRAM_BOT_TOKEN}/${isFormData ? 'sendPhoto' : 'sendMessage'}`,
        method: "POST",
        headers,
        agent,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            getLogger().info("[TelegramClient] Gửi tin nhắn thành công!", { 
              text: payload.text ? payload.text.substring(0, 50) + "..." : "Media",
              thread: payload.message_thread_id 
            });
            resolve(data);
          } else {
            reject(new Error(`Telegram Error ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.setTimeout(HTTP_TIMEOUT_MS, () => {
      req.destroy(new Error("Telegram request timed out"));
    });

    req.on("error", reject);

    if (isFormData) {
      payload.pipe(req);
    } else {
      req.write(JSON.stringify(payload));
      req.end();
    }
  });
}

function preparePayload(basePayload) {
  // If it's already a FormData object, return it as is
  if (basePayload && typeof basePayload.getHeaders === "function") {
    return basePayload;
  }

  // Create FormData if photo is present
  if (basePayload && basePayload.photo) {
    const FormData = require("form-data");
    const form = new FormData();
    if (basePayload.chat_id) form.append("chat_id", basePayload.chat_id);
    if (basePayload.message_thread_id && Number.isFinite(basePayload.message_thread_id)) {
      form.append("message_thread_id", basePayload.message_thread_id);
    }
    form.append("photo", basePayload.photo, { filename: "qr.png", contentType: "image/png" });
    if (basePayload.caption) form.append("caption", basePayload.caption);
    if (basePayload.parse_mode) form.append("parse_mode", basePayload.parse_mode);
    return form;
  }

  // Clean up message_thread_id for JSON payload too
  const finalPayload = { ...basePayload };
  if (!Number.isFinite(finalPayload.message_thread_id)) {
    delete finalPayload.message_thread_id;
  }
  return finalPayload;
}

/**
 * Xử lý hàng đợi
 */
async function processQueue() {
  if (isSending || queue.length === 0) return;
  isSending = true;

  const job = queue.shift(); // Lấy job đầu tiên

  try {
    const payloadToSend = preparePayload(job.payload);
    await rawPostToTelegram(payloadToSend);
    job.resolve(true);
  } catch (error) {
    getLogger().error("[TelegramClient] Failed to send message", { error: error.message });
    
    // Auto-retry/Fallback logic: Nếu lỗi "message thread not found", thử gửi ra chat chung
    if (error.message.includes("message thread not found") && job.payload && job.payload.message_thread_id) {
      getLogger().warn("[TelegramClient] Thread not found, falling back to main chat");
      delete job.payload.message_thread_id;
      try {
        const retryPayload = preparePayload(job.payload);
        await rawPostToTelegram(retryPayload);
        job.resolve(true);
      } catch (fallbackError) {
        getLogger().error("[TelegramClient] Fallback failed", { error: fallbackError.message });
        job.resolve(false); // Resolve false instead of reject to prevent unhandledRejection
      }
    } else if (error.message.includes("429") || error.message.includes("Too Many Requests")) {
      let retryAfter = 5; // Default 5s
      const match = error.message.match(/retry after (\d+)/i) || error.message.match(/"retry_after":\s*(\d+)/i);
      if (match && match[1]) {
        retryAfter = parseInt(match[1], 10);
      }
      
      getLogger().warn(`[TelegramClient] Rate limited (429), pausing queue for ${retryAfter}s`);
      queue.unshift(job); // Trả lại job về đầu hàng chờ
      
      setTimeout(() => {
        isSending = false;
        processQueue();
      }, retryAfter * 1000 + 500); // Đợi số giây yêu cầu + 0.5s bù trừ
      
      return; // Không gọi set timeout RATE_LIMIT_MS ở dưới nữa
    } else {
      job.resolve(false); // Resolve false instead of reject to prevent unhandledRejection
    }
  }

  // Chờ cho hết RATE_LIMIT_MS rồi xử lý tiếp
  setTimeout(() => {
    isSending = false;
    processQueue();
  }, RATE_LIMIT_MS);
}

/**
 * Đẩy tin nhắn vào hàng đợi
 * @param {Object|FormData} payload Dữ liệu gửi đi
 * @param {Object} options 
 * @param {boolean} options.isError Đánh dấu tin nhắn báo lỗi để xếp ưu tiên lên đầu
 * @returns {Promise}
 */
function enqueueMessage(payload, { isError = false } = {}) {
  return new Promise((resolve, reject) => {
    if (!TELEGRAM_BOT_TOKEN) {
      getLogger().warn("[TelegramClient] Skipped - No bot token config");
      return resolve(false);
    }

    if (queue.length >= MAX_QUEUE) {
      const dropMsg = "[TelegramClient] Queue full. Dropping message.";
      getLogger().warn(dropMsg);
      return reject(new Error(dropMsg));
    }

    const job = { payload, resolve, reject };

    if (isError) {
      queue.unshift(job); // Nhảy cóc lên đầu hàng đợi
    } else {
      queue.push(job);
    }

    processQueue();
  });
}

module.exports = { enqueueMessage };
