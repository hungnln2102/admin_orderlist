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

/**
 * Xử lý hàng đợi
 */
async function processQueue() {
  if (isSending || queue.length === 0) return;
  isSending = true;

  const job = queue.shift(); // Lấy job đầu tiên

  try {
    await rawPostToTelegram(job.payload);
    job.resolve(true);
  } catch (error) {
    getLogger().error("[TelegramClient] Failed to send message", { error: error.message });
    
    // Auto-retry/Fallback logic: Nếu lỗi "message thread not found", thử gửi ra chat chung
    if (error.message.includes("message thread not found") && job.payload && job.payload.message_thread_id) {
      getLogger().warn("[TelegramClient] Thread not found, falling back to main chat");
      delete job.payload.message_thread_id;
      try {
        await rawPostToTelegram(job.payload);
        job.resolve(true);
      } catch (fallbackError) {
        getLogger().error("[TelegramClient] Fallback failed", { error: fallbackError.message });
        job.reject(fallbackError);
      }
    } else {
      job.reject(error);
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
