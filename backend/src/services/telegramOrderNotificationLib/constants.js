/**
 * Cấu hình Telegram và QR từ env. Không hardcode giá trị nhạy cảm.
 */

const HTTP_TIMEOUT_MS = 10_000;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const TELEGRAM_ORDER_TOPIC_ID = Number.parseInt(
  process.env.TELEGRAM_ORDER_TOPIC_ID || "1",
  10
);
const SEND_ORDER_NOTIFICATION =
  String(process.env.SEND_ORDER_NOTIFICATION || "true").toLowerCase() !== "false";
const SEND_ORDER_TO_TOPIC =
  String(process.env.SEND_ORDER_NOTIFICATION || "true").toLowerCase() !== "false";

const QR_ACCOUNT_NUMBER = process.env.ORDER_QR_ACCOUNT_NUMBER || "9183400998";
const QR_BANK_CODE = process.env.ORDER_QR_BANK_CODE || "VPB";
const QR_ACCOUNT_NAME = process.env.ORDER_QR_ACCOUNT_NAME || "NGO LE NGOC HUNG";
const QR_NOTE_PREFIX = process.env.ORDER_QR_NOTE_PREFIX || "Thanh toan";
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
