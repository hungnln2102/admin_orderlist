/**
 * Cấu hình tập trung cho toàn bộ Cổng Thông báo Telegram.
 */

const HTTP_TIMEOUT_MS = (() => {
  const raw = Number.parseInt(process.env.TELEGRAM_HTTP_TIMEOUT_MS || "", 10);
  if (Number.isFinite(raw) && raw >= 5_000 && raw <= 120_000) return raw;
  return 20_000;
})();

function parseOptionalTopicId(raw) {
  if (raw == null) return NaN;
  const s = String(raw).trim();
  if (s === "") return NaN;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : NaN;
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

// Các cờ kích hoạt/tắt
const SEND_ORDER_NOTIFICATION = String(process.env.SEND_ORDER_NOTIFICATION || "true").toLowerCase() !== "false";
const SEND_FINANCE_DELTA_NOTIFICATION = String(process.env.SEND_FINANCE_DELTA_NOTIFICATION ?? "true").toLowerCase() !== "false";
const SEND_ERROR_NOTIFICATION = String(process.env.SEND_ERROR_NOTIFICATION || "true").toLowerCase() !== "false";
const SEND_ORDER_TO_TOPIC = String(process.env.SEND_ORDER_TO_TOPIC ?? "true").toLowerCase() !== "false";
const SEND_ORDER_COPY_BUTTONS = String(process.env.SEND_ORDER_COPY_BUTTONS || "true").toLowerCase() !== "false";

// Topic IDs
const TELEGRAM_ORDER_TOPIC_ID = parseOptionalTopicId(process.env.TELEGRAM_ORDER_TOPIC_ID);
const TELEGRAM_IMPORT_ORDER_TOPIC_ID = parseOptionalTopicId(process.env.TELEGRAM_IMPORT_ORDER_TOPIC_ID);
const TELEGRAM_FINANCE_TOPIC_ID = parseOptionalTopicId(process.env.TELEGRAM_FINANCE_TOPIC_ID || "7009");
const ERROR_TOPIC_ID = parseOptionalTopicId(process.env.ERROR_TOPIC_ID || "6");
const ZERO_DAYS_TOPIC_ID = parseOptionalTopicId(process.env.ZERO_DAYS_TOPIC_ID || "2563");
const FOUR_DAYS_TOPIC_ID = parseOptionalTopicId(process.env.FOUR_DAYS_TOPIC_ID || "12");

// Logic gán topic mặc định cho Đơn mới
const ORDER_CREATED_TOPIC_ID = (() => {
  if (Number.isFinite(TELEGRAM_ORDER_TOPIC_ID)) return TELEGRAM_ORDER_TOPIC_ID;
  if (Number.isFinite(FOUR_DAYS_TOPIC_ID)) return FOUR_DAYS_TOPIC_ID;
  return NaN;
})();

module.exports = {
  HTTP_TIMEOUT_MS,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  
  SEND_ORDER_NOTIFICATION,
  SEND_FINANCE_DELTA_NOTIFICATION,
  SEND_ERROR_NOTIFICATION,
  SEND_ORDER_TO_TOPIC,
  SEND_ORDER_COPY_BUTTONS,
  
  TELEGRAM_ORDER_TOPIC_ID,
  TELEGRAM_IMPORT_ORDER_TOPIC_ID,
  TELEGRAM_FINANCE_TOPIC_ID,
  ERROR_TOPIC_ID,
  ZERO_DAYS_TOPIC_ID,
  FOUR_DAYS_TOPIC_ID,
  ORDER_CREATED_TOPIC_ID,
};
