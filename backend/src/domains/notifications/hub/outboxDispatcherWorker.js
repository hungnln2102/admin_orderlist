/**
 * outboxDispatcherWorker.js
 * Tiến trình nền điều phối gửi tin nhắn từ Durable Outbox (notifications_outbox).
 * Chịu trách nhiệm:
 * 1. Khóa nguyên tử từng tin nhắn (FOR UPDATE SKIP LOCKED) chống xử lý trùng giữa nhiều tiến trình.
 * 2. Giãn cách Rate Limiter (1.5s/tin) để bảo đảm Bot không bị Telegram giới hạn tần suất.
 * 3. Tự động xử lý lỗi 429 Too Many Requests (đọc retry_after và lùi lịch chính xác).
 * 4. Tự động thử lại (Exponential Backoff Retry) khi gặp lỗi mạng/kết nối.
 * 5. Cập nhật trạng thái SENT / FAILED và ghi nhận thời gian gửi bền vững.
 */

const { db, TABLES, COLS } = require("@/db");
const { rawPostToTelegram, preparePayload } = require("@/domains/notifications/telegram/core/telegramClient");
const { TELEGRAM_CHAT_ID } = require("@/domains/notifications/telegram/core/constants");
const systemConfigService = require("@/domains/system/services/systemConfigService");

const O = COLS.NOTIFICATIONS_OUTBOX;
const RATE_LIMIT_MS = 1500; // Giãn cách 1.5 giây giữa mỗi tin nhắn

let isRunning = false;
let loopTimer = null;
let isProcessingSingle = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Lấy và khóa an toàn 1 bản ghi PENDING tiếp theo (SKIP LOCKED)
 */
async function fetchAndLockNextOutboxItem() {
  return db.transaction(async (trx) => {
    const rawSql = `
      SELECT * FROM ${TABLES.NOTIFICATIONS_OUTBOX}
      WHERE status = 'PENDING'
        AND next_retry_at <= NOW()
      ORDER BY priority ASC, id ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;
    const result = await trx.raw(rawSql);
    const item = result?.rows?.[0];

    if (!item) return null;

    await trx(TABLES.NOTIFICATIONS_OUTBOX)
      .where("id", item.id)
      .update({
        status: "PROCESSING",
        updated_at: db.fn.now(),
      });

    item.status = "PROCESSING";
    return item;
  });
}

/**
 * Xử lý gửi 1 bản ghi outbox tới Telegram API
 */
async function processOutboxItem(item) {
  const isEnabled = systemConfigService.get("TELEGRAM_ENABLED", true);
  if (!isEnabled) {
    console.log(`[OutboxDispatcher] Bỏ qua tin #${item.id}: TELEGRAM_ENABLED đang tắt. Hoàn lại PENDING.`);
    await db(TABLES.NOTIFICATIONS_OUTBOX)
      .where("id", item.id)
      .update({
        status: "PENDING",
        next_retry_at: db.raw("NOW() + INTERVAL '1 minute'"),
        last_error: "TELEGRAM_DISABLED",
        updated_at: db.fn.now(),
      });
    return { success: false, skipped: true };
  }

  const threadId = item.recipient ? Number(item.recipient) : NaN;
  const isThreadValid = Number.isFinite(threadId);

  let payload = {};
  if (item.has_media && item.media_buffer_base64) {
    const buffer = Buffer.from(item.media_buffer_base64, "base64");
    payload = {
      chat_id: TELEGRAM_CHAT_ID,
      photo: buffer,
      caption: item.rendered_content,
      parse_mode: "HTML",
    };
    if (isThreadValid) {
      payload.message_thread_id = threadId;
    }
  } else {
    payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: item.rendered_content,
      parse_mode: "HTML",
    };
    if (isThreadValid) {
      payload.message_thread_id = threadId;
    }
  }

  try {
    const prepared = preparePayload(payload);
    await rawPostToTelegram(prepared, item.event_type);

    // Gửi thành công -> Cập nhật trạng thái SENT
    await db(TABLES.NOTIFICATIONS_OUTBOX)
      .where("id", item.id)
      .update({
        status: "SENT",
        sent_at: db.fn.now(),
        last_error: null,
        updated_at: db.fn.now(),
      });

    return { success: true, id: item.id };
  } catch (error) {
    const errMsg = error.message || String(error);
    console.error(`[OutboxDispatcher] Lỗi khi gửi tin #${item.id}:`, errMsg);

    // Fallback: nếu lỗi do thread không tồn tại -> thử gửi lại không thread
    if (errMsg.includes("message thread not found") && isThreadValid) {
      console.warn(`[OutboxDispatcher] Topic #${threadId} không tồn tại, fallback về Chat chung...`);
      delete payload.message_thread_id;
      try {
        const fallbackPrepared = preparePayload(payload);
        await rawPostToTelegram(fallbackPrepared, item.event_type);

        await db(TABLES.NOTIFICATIONS_OUTBOX)
          .where("id", item.id)
          .update({
            status: "SENT",
            sent_at: db.fn.now(),
            last_error: "FALLBACK_MAIN_CHAT_SUCCESS",
            updated_at: db.fn.now(),
          });

        return { success: true, id: item.id, fallback: true };
      } catch (fallbackErr) {
        console.error(`[OutboxDispatcher] Fallback thất bại:`, fallbackErr.message);
      }
    }

    // Xử lý Rate Limit 429
    let retryDelaySec = 5;
    if (errMsg.includes("429") || errMsg.includes("Too Many Requests")) {
      const match = errMsg.match(/retry after (\d+)/i) || errMsg.match(/"retry_after":\s*(\d+)/i);
      if (match && match[1]) {
        retryDelaySec = Number(match[1]);
      }
    } else {
      // Exponential Backoff: 15s, 30s, 60s, 120s, 240s
      const nextCount = Number(item.retry_count || 0) + 1;
      retryDelaySec = Math.min(300, Math.pow(2, nextCount) * 15);
    }

    const newRetryCount = Number(item.retry_count || 0) + 1;
    const isExhausted = newRetryCount >= Number(item.max_retries || 5);

    if (isExhausted) {
      await db(TABLES.NOTIFICATIONS_OUTBOX)
        .where("id", item.id)
        .update({
          status: "FAILED",
          retry_count: newRetryCount,
          last_error: errMsg,
          updated_at: db.fn.now(),
        });
    } else {
      await db.raw(`
        UPDATE ${TABLES.NOTIFICATIONS_OUTBOX}
        SET status = 'PENDING',
            retry_count = ?,
            next_retry_at = NOW() + INTERVAL '${retryDelaySec} seconds',
            last_error = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [newRetryCount, errMsg, item.id]);
    }

    return { success: false, error: errMsg, retryAfterSec: retryDelaySec };
  }
}

let lastRecoveryTime = 0;

/**
 * Quét phục hồi các bản ghi mang trạng thái PROCESSING nhưng đã bị treo quá lâu
 * (do crash tiến trình, mất điện, kill tiến trình giữa chừng).
 * Chuyển các bản ghi này về PENDING để tiến trình chạy tiếp tục xử lý.
 * @param {number} [staleTimeoutMinutes=5]
 * @returns {Promise<number>} Số lượng bản ghi được phục hồi
 */
async function recoverStaleProcessing(staleTimeoutMinutes = 5) {
  const safeMinutes = Math.max(1, Number(staleTimeoutMinutes) || 5);
  const result = await db.raw(`
    UPDATE ${TABLES.NOTIFICATIONS_OUTBOX}
    SET status = 'PENDING',
        next_retry_at = NOW(),
        retry_count = retry_count + 1,
        last_error = 'RECOVERED_FROM_STALE_PROCESSING',
        updated_at = NOW()
    WHERE status = 'PROCESSING'
      AND updated_at < NOW() - INTERVAL '${safeMinutes} minutes'
    RETURNING id
  `);
  const count = result?.rowCount || result?.rows?.length || 0;
  if (count > 0) {
    console.warn(`[OutboxDispatcherWorker] ⚠️ Đã phục hồi ${count} bản ghi PROCESSING bị kẹt về PENDING.`);
  }
  return count;
}

/**
 * Xử lý đẩy toàn bộ tin nhắn đang chờ (hỗ trợ gọi thủ công hoặc trong test)
 * @param {Object} options
 * @param {number} [options.limit=50]
 * @param {number} [options.rateLimitMs=RATE_LIMIT_MS]
 * @returns {Promise<{ processed: number, success: number, failed: number }>}
 */
async function flushPending({ limit = 50, rateLimitMs = RATE_LIMIT_MS } = {}) {
  await recoverStaleProcessing().catch(() => {});

  let count = 0;
  let successCount = 0;
  let failedCount = 0;

  while (count < limit) {
    const item = await fetchAndLockNextOutboxItem();
    if (!item) break; // Hết tin nhắn pending

    count += 1;
    const res = await processOutboxItem(item);
    if (res.success) {
      successCount += 1;
    } else {
      failedCount += 1;
    }

    if (rateLimitMs > 0) {
      await sleep(rateLimitMs);
    }
  }

  return { processed: count, success: successCount, failed: failedCount };
}

/**
 * Một vòng lặp dispatch chạy nền
 */
async function tick() {
  if (isProcessingSingle) return;
  isProcessingSingle = true;

  try {
    // Quét phục hồi lease sau mỗi 60 giây
    if (Date.now() - lastRecoveryTime > 60000) {
      lastRecoveryTime = Date.now();
      await recoverStaleProcessing().catch(() => {});
    }

    const item = await fetchAndLockNextOutboxItem();
    if (item) {
      await processOutboxItem(item);
    }
  } catch (err) {
    console.error("[OutboxDispatcherWorker] Lỗi trong tick():", err.message);
  } finally {
    isProcessingSingle = false;
  }
}

/**
 * Khởi động Worker chạy nền
 * @param {number} [pollIntervalMs=3000] Chu kỳ quét tin nhắn mới (mặc định 3s)
 */
function start(pollIntervalMs = 3000) {
  if (isRunning) return;
  isRunning = true;
  console.log(`[OutboxDispatcherWorker] 🚀 Đã khởi động Worker điều phối thông báo (Chu kỳ quét: ${pollIntervalMs}ms).`);

  // Phục hồi các bản ghi kẹt từ lần chạy trước
  recoverStaleProcessing().catch(() => {});

  loopTimer = setInterval(() => {
    tick().catch((e) => console.error("[OutboxDispatcherWorker] Tick error:", e));
  }, pollIntervalMs);

  // Kích hoạt ngay nhịp đầu
  tick().catch(() => {});
}

/**
 * Dừng Worker
 */
function stop() {
  if (!isRunning) return;
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
  isRunning = false;
  console.log("[OutboxDispatcherWorker] 🛑 Đã dừng Worker điều phối thông báo.");
}

module.exports = {
  start,
  stop,
  flushPending,
  processOutboxItem,
  fetchAndLockNextOutboxItem,
  recoverStaleProcessing,
};
