/**
 * Cấu hình Telegram và QR từ env. Không hardcode giá trị nhạy cảm.
 */

const HTTP_TIMEOUT_MS = 10_000;

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
/** MAVN: chat riêng (vd https://t.me/c/2934465528/4187 → -1002934465528). Trống = dùng TELEGRAM_CHAT_ID. */
const TELEGRAM_IMPORT_ORDER_CHAT_ID_RAW = (
  process.env.TELEGRAM_IMPORT_ORDER_CHAT_ID || ""
).trim();
const TELEGRAM_IMPORT_ORDER_CHAT_ID =
  TELEGRAM_IMPORT_ORDER_CHAT_ID_RAW || TELEGRAM_CHAT_ID;
const TELEGRAM_IMPORT_ORDER_TOPIC_ID = parseOptionalTopicId(
  process.env.TELEGRAM_IMPORT_ORDER_TOPIC_ID
);
const SEND_ORDER_NOTIFICATION =
  String(process.env.SEND_ORDER_NOTIFICATION || "true").toLowerCase() !== "false";
/** Gửi đơn mới vào topic forum (message_thread_id). Tách khỏi SEND_ORDER_NOTIFICATION. */
const SEND_ORDER_TO_TOPIC =
  String(process.env.SEND_ORDER_TO_TOPIC ?? "true").toLowerCase() !== "false";

const QR_ACCOUNT_NUMBER = (process.env.ORDER_QR_ACCOUNT_NUMBER || "").trim();
const QR_BANK_CODE = (process.env.ORDER_QR_BANK_CODE || "VPB").trim();
const QR_ACCOUNT_NAME = (process.env.ORDER_QR_ACCOUNT_NAME || "").trim();
const QR_NOTE_PREFIX = (process.env.ORDER_QR_NOTE_PREFIX || "Thanh toan").trim();
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

module.exports = {
  HTTP_TIMEOUT_MS,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TELEGRAM_ORDER_TOPIC_ID,
  TELEGRAM_IMPORT_ORDER_CHAT_ID,
  TELEGRAM_IMPORT_ORDER_TOPIC_ID,
  SEND_ORDER_NOTIFICATION,
  SEND_ORDER_TO_TOPIC,
  QR_ACCOUNT_NUMBER,
  QR_BANK_CODE,
  QR_ACCOUNT_NAME,
  QR_NOTE_PREFIX,
  SEND_ORDER_COPY_BUTTONS,
  ZERO_DAYS_TOPIC_ID,
  FOUR_DAYS_TOPIC_ID,
};
