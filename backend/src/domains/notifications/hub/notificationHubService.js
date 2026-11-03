/**
 * notificationHubService.js
 * Trung tâm điều phối và quản trị thông báo tập trung (Unified Notification Hub).
 * Chịu trách nhiệm:
 * 1. Tiếp nhận mọi yêu cầu gửi thông báo từ toàn bộ hệ thống (Order, Finance, System, Cron).
 * 2. Bảo đảm tính bất biến & bền vững (Durable) bằng Transactional Outbox.
 * 3. Chống gửi trùng lặp tuyệt đối (Idempotency Key với ON CONFLICT DO NOTHING).
 * 4. Tự động dọn dẹp log sau 7 ngày (7-day Auto-Pruning Policy) theo chỉ đạo của Master.
 */

const { db, TABLES, COLS } = require("@/db");
const constants = require("@/domains/notifications/telegram/core/constants");

const O = COLS.NOTIFICATIONS_OUTBOX;

/**
 * Tra cứu topic ID mặc định theo topicKey nghiệp vụ
 */
function resolveTopicRecipient(topicKey, fallbackRecipient) {
  if (fallbackRecipient) return String(fallbackRecipient);

  switch (topicKey) {
    case "RENEWAL_REMINDER":
    case "FOUR_DAYS":
      return String(constants.FOUR_DAYS_TOPIC_ID || 12);
    case "EXPIRED":
    case "ZERO_DAYS":
      return String(constants.ZERO_DAYS_TOPIC_ID || 2563);
    case "FINANCE":
    case "FINANCE_DELTA":
      return String(constants.TELEGRAM_FINANCE_TOPIC_ID || 7009);
    case "SYSTEM_ALERT":
    case "SYSTEM_ERROR":
      return String(constants.ERROR_TOPIC_ID || 6);
    case "ORDER_RENEWED":
      return String(constants.TELEGRAM_RENEWAL_TOPIC_ID || 2);
    case "ORDER_CREATED":
      return String(constants.ORDER_CREATED_TOPIC_ID || constants.TELEGRAM_ORDER_TOPIC_ID || constants.FOUR_DAYS_TOPIC_ID || 12);
    default:
      return String(constants.TELEGRAM_CHAT_ID || "");
  }
}

/**
 * Đẩy thông báo vào Outbox với cơ chế Idempotency
 * @param {Object} options
 * @param {string} [options.channel='TELEGRAM']
 * @param {string} options.eventType Tên loại sự kiện (ORDER_RENEWAL_REMINDER, ORDER_CREATED, etc.)
 * @param {string} options.idempotencyKey Khóa chống trùng lặp duy nhất
 * @param {string} [options.topicKey] Khóa topic nghiệp vụ (RENEWAL_REMINDER, FINANCE, etc.)
 * @param {string|number} [options.recipient] Topic ID hoặc Chat ID đích
 * @param {number} [options.priority=3] Mức độ ưu tiên (1: Critical, 2: High, 3: Normal, 4: Low)
 * @param {Object} [options.payload] Dữ liệu gốc
 * @param {string} [options.renderedTitle] Tiêu đề thông báo
 * @param {string} options.renderedContent Nội dung HTML hoàn chỉnh
 * @param {boolean} [options.hasMedia=false] Có đính kèm file media/ảnh không
 * @param {Buffer|string} [options.mediaBuffer] Buffer ảnh hoặc chuỗi base64
 * @param {string} [options.mediaFilename='image.png'] Tên file
 * @param {Object} [options.trx] Knex transaction tùy chọn
 * @returns {Promise<{ queued: boolean, id: number|null, skipped: boolean, reason?: string }>}
 */
async function dispatch(options = {}) {
  const {
    channel = "TELEGRAM",
    eventType,
    idempotencyKey,
    topicKey,
    recipient,
    priority = 3,
    payload = null,
    renderedTitle = null,
    renderedContent,
    hasMedia = false,
    mediaBuffer = null,
    mediaFilename = "qr.png",
    trx = null,
  } = options;

  if (!eventType) throw new Error("NotificationHub: eventType là bắt buộc.");
  if (!idempotencyKey) throw new Error("NotificationHub: idempotencyKey là bắt buộc để bảo đảm chống gửi trùng.");
  if (!renderedContent) throw new Error("NotificationHub: renderedContent không được để trống.");

  const targetRecipient = resolveTopicRecipient(topicKey, recipient);

  let mediaBase64 = null;
  if (hasMedia && mediaBuffer) {
    if (Buffer.isBuffer(mediaBuffer)) {
      mediaBase64 = mediaBuffer.toString("base64");
    } else if (typeof mediaBuffer === "string") {
      mediaBase64 = mediaBuffer;
    }
  }

  const record = {
    [O.CHANNEL]: channel,
    [O.EVENT_TYPE]: eventType,
    [O.IDEMPOTENCY_KEY]: String(idempotencyKey).trim(),
    [O.TOPIC_KEY]: topicKey || null,
    [O.RECIPIENT]: targetRecipient,
    [O.PRIORITY]: Number(priority) || 3,
    [O.PAYLOAD]: payload ? JSON.stringify(payload) : null,
    [O.RENDERED_TITLE]: renderedTitle ? String(renderedTitle).slice(0, 255) : null,
    [O.RENDERED_CONTENT]: renderedContent,
    [O.HAS_MEDIA]: Boolean(hasMedia && mediaBase64),
    [O.MEDIA_BUFFER_BASE64]: mediaBase64,
    [O.MEDIA_FILENAME]: mediaFilename || "image.png",
    [O.STATUS]: "PENDING",
    [O.RETRY_COUNT]: 0,
    [O.MAX_RETRIES]: 5,
    [O.NEXT_RETRY_AT]: db.fn.now(),
    [O.CREATED_AT]: db.fn.now(),
    [O.UPDATED_AT]: db.fn.now(),
  };

  const queryExecutor = trx || db;

  // Sử dụng câu lệnh INSERT ... ON CONFLICT DO NOTHING chuẩn PostgreSQL
  const result = await queryExecutor(TABLES.NOTIFICATIONS_OUTBOX)
    .insert(record)
    .onConflict(O.IDEMPOTENCY_KEY)
    .ignore()
    .returning(["id", "status"]);

  const inserted = result?.[0];
  if (!inserted) {
    // Đã tồn tại do trùng idempotency_key
    return {
      queued: false,
      id: null,
      skipped: true,
      reason: "DUPLICATE_IDEMPOTENCY_KEY",
    };
  }

  return {
    queued: true,
    id: inserted.id,
    status: inserted.status,
    skipped: false,
  };
}

/**
 * Chính sách Tự Động Dọn Dẹp Log (7-Day Rolling Retention & Auto-Prune)
 * Xóa sạch các log đã hoàn thành cũ hơn 7 ngày theo chỉ đạo của Master.
 *
 * @param {number} [retentionDays=7] Số ngày lưu trữ tối đa (mặc định: 7)
 * @returns {Promise<{ outboxPruned: number, logsPruned: number, cronLogsPruned: number }>}
 */
async function pruneOldLogs(retentionDays = 7) {
  const days = Math.max(1, Number(retentionDays) || 7);
  const cutoffSql = `NOW() - INTERVAL '${days} days'`;

  // 1. Dọn dẹp notifications_outbox: Chỉ xóa các tin đã SENT, FAILED hoặc CANCELLED
  // Tuyệt đối không xóa PENDING hoặc PROCESSING
  const outboxResult = await db.raw(`
    DELETE FROM ${TABLES.NOTIFICATIONS_OUTBOX}
    WHERE status IN ('SENT', 'FAILED', 'CANCELLED')
      AND created_at < ${cutoffSql}
    RETURNING id;
  `);
  const outboxPruned = outboxResult.rowCount || (outboxResult.rows || []).length || 0;

  // 2. Dọn dẹp notification_logs
  const logsResult = await db.raw(`
    DELETE FROM ${TABLES.NOTIFICATION_LOGS}
    WHERE sent_at < ${cutoffSql}
    RETURNING id;
  `);
  const logsPruned = logsResult.rowCount || (logsResult.rows || []).length || 0;

  // 3. Dọn dẹp cron_job_logs
  const cronLogsResult = await db.raw(`
    DELETE FROM ${TABLES.CRON_JOB_LOGS}
    WHERE started_at < ${cutoffSql}
    RETURNING id;
  `);
  const cronLogsPruned = cronLogsResult.rowCount || (cronLogsResult.rows || []).length || 0;

  console.log(`[NotificationHub] 🧹 Auto-Pruning (${days} ngày): Đã xóa ${outboxPruned} outbox, ${logsPruned} notif_logs, ${cronLogsPruned} cron_logs.`);

  return {
    outboxPruned,
    logsPruned,
    cronLogsPruned,
  };
}

/**
 * Thống kê tình trạng Outbox phục vụ Dashboard giám sát
 */
async function getOutboxStats() {
  const counts = await db(TABLES.NOTIFICATIONS_OUTBOX)
    .select("status")
    .count("id as count")
    .groupBy("status");

  const stats = {
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
    total: 0,
  };

  counts.forEach((row) => {
    const s = String(row.status || "").toLowerCase();
    const c = Number(row.count || 0);
    if (s === "pending") stats.pending = c;
    if (s === "processing") stats.processing = c;
    if (s === "sent") stats.sent = c;
    if (s === "failed") stats.failed = c;
    stats.total += c;
  });

  return stats;
}

/**
 * Lấy danh sách tin nhắn Outbox gần đây
 */
async function listRecentOutbox(limit = 20) {
  return db(TABLES.NOTIFICATIONS_OUTBOX)
    .orderBy("id", "desc")
    .limit(limit);
}

module.exports = {
  dispatch,
  pruneOldLogs,
  getOutboxStats,
  listRecentOutbox,
  resolveTopicRecipient,
};

