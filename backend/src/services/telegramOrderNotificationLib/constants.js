/**
 * Cấu hình Telegram và QR từ env. Không hardcode giá trị nhạy cảm.
 */

/**
 * Timeout HTTP request tới Telegram API. Mặc định 20s — Telegram đôi khi
 * chậm 10–15s khi mạng đứng (đặc biệt sendPhoto), 10s cũ dễ false-positive timeout.
 * Có thể chỉnh qua env `TELEGRAM_HTTP_TIMEOUT_MS`.
 */
const HTTP_TIMEOUT_MS = (() => {
  const raw = Number.parseInt(process.env.TELEGRAM_HTTP_TIMEOUT_MS || "", 10);
  if (Number.isFinite(raw) && raw >= 5_000 && raw <= 120_000) return raw;
  return 20_000;
})();

// message_thread_id only when TELEGRAM_ORDER_TOPIC_ID is set to a valid integer (no default "1").
function parseOptionalTopicId(raw) {
  if (raw == null) return NaN;
  const s = String(raw).trim();
  if (s === "") return NaN;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : NaN;
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const TELEGRAM_ORDER_TOPIC_ID = parseOptionalTopicId(
  process.env.TELEGRAM_ORDER_TOPIC_ID
);
const TELEGRAM_IMPORT_ORDER_TOPIC_ID = parseOptionalTopicId(
  process.env.TELEGRAM_IMPORT_ORDER_TOPIC_ID
);
/** Topic tài chính dashboard: link dạng https://t.me/c/<chat-id>/<topic-id>. */
const TELEGRAM_FINANCE_TOPIC_ID = parseOptionalTopicId(
  process.env.TELEGRAM_FINANCE_TOPIC_ID || "7009"
);
const SEND_FINANCE_DELTA_NOTIFICATION =
  String(process.env.SEND_FINANCE_DELTA_NOTIFICATION ?? "true").toLowerCase() !==
  "false";
const SEND_ORDER_NOTIFICATION =
  String(process.env.SEND_ORDER_NOTIFICATION || "true").toLowerCase() !== "false";
/** Gửi đơn mới vào topic forum (message_thread_id). Tách khỏi SEND_ORDER_NOTIFICATION. */
const SEND_ORDER_TO_TOPIC =
  String(process.env.SEND_ORDER_TO_TOPIC ?? "true").toLowerCase() !== "false";

const SEND_ORDER_COPY_BUTTONS =
  String(process.env.SEND_ORDER_COPY_BUTTONS || "true").toLowerCase() !== "false";

const ZERO_DAYS_TOPIC_ID = Number.parseInt(
  process.env.ZERO_DAYS_TOPIC_ID || "2563",
  10
);
const FOUR_DAYS_TOPIC_ID = Number.parseInt(
  process.env.FOUR_DAYS_TOPIC_ID || "12",
  10
);

/** Topic đơn mới: ưu tiên TELEGRAM_ORDER_TOPIC_ID; nếu không set thì dùng FOUR_DAYS_TOPIC_ID để cùng kênh gia hạn. */
const ORDER_CREATED_TOPIC_ID = (() => {
  if (Number.isFinite(TELEGRAM_ORDER_TOPIC_ID)) return TELEGRAM_ORDER_TOPIC_ID;
  if (Number.isFinite(FOUR_DAYS_TOPIC_ID)) return FOUR_DAYS_TOPIC_ID;
  return NaN;
})();

module.exports = {
  HTTP_TIMEOUT_MS,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TELEGRAM_ORDER_TOPIC_ID,
  TELEGRAM_IMPORT_ORDER_TOPIC_ID,
  TELEGRAM_FINANCE_TOPIC_ID,
  SEND_FINANCE_DELTA_NOTIFICATION,
  SEND_ORDER_NOTIFICATION,
  SEND_ORDER_TO_TOPIC,
  SEND_ORDER_COPY_BUTTONS,
  ZERO_DAYS_TOPIC_ID,
  FOUR_DAYS_TOPIC_ID,
  ORDER_CREATED_TOPIC_ID,
};
