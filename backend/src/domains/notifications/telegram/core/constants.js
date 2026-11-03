/**
 * Cấu hình tập trung cho toàn bộ Cổng Thông báo Telegram.
 */

const HTTP_TIMEOUT_MS = (() => {
  const raw = Number.parseInt(process.env.TELEGRAM_HTTP_TIMEOUT_MS || "", 10);
  if (Number.isFinite(raw) && raw >= 5_000 && raw <= 120_000) return raw;
  return 20_000;
})();

const systemConfigService = require("@/domains/system/services/systemConfigService");

function parseOptionalTopicId(raw) {
  if (raw == null) return NaN;
  const s = String(raw).trim();
  if (s === "") return NaN;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : NaN;
}

const getConfigVal = (configKey, envVal, defaultVal = "") => {
  const dynamicVal = systemConfigService.get(configKey);
  if (dynamicVal !== null && dynamicVal !== undefined && String(dynamicVal).trim() !== "") {
    return String(dynamicVal).trim();
  }
  return String(envVal || defaultVal).trim();
};

const getBoolConfig = (configKey, envVal, defaultVal = true) => {
  const dynamicVal = systemConfigService.get(configKey);
  if (dynamicVal !== null && dynamicVal !== undefined) {
    if (typeof dynamicVal === 'boolean') return dynamicVal;
    return String(dynamicVal).toLowerCase() !== 'false';
  }
  return String(envVal ?? defaultVal).toLowerCase() !== 'false';
};

// Topic IDs (Đọc động từ systemConfigService với fallback qua env)
const getTopicId = (configKey, envVal, defaultVal) => {
  const dynamicVal = systemConfigService.get(configKey);
  if (dynamicVal !== null && dynamicVal !== undefined && String(dynamicVal).trim() !== "") {
    return parseOptionalTopicId(dynamicVal);
  }
  return parseOptionalTopicId(envVal || defaultVal);
};

module.exports = {
  get HTTP_TIMEOUT_MS() { return HTTP_TIMEOUT_MS; },
  get TELEGRAM_BOT_TOKEN() { return getConfigVal("TELEGRAM_BOT_TOKEN", process.env.TELEGRAM_BOT_TOKEN); },
  get TELEGRAM_CHAT_ID() { return getConfigVal("TELEGRAM_CHAT_ID", process.env.TELEGRAM_CHAT_ID); },
  
  get SEND_ORDER_NOTIFICATION() { return getBoolConfig("SEND_ORDER_NOTIFICATION", process.env.SEND_ORDER_NOTIFICATION, true); },
  get SEND_FINANCE_DELTA_NOTIFICATION() { return getBoolConfig("SEND_FINANCE_DELTA_NOTIFICATION", process.env.SEND_FINANCE_DELTA_NOTIFICATION, true); },
  get SEND_ERROR_NOTIFICATION() { return getBoolConfig("SEND_ERROR_NOTIFICATION", process.env.SEND_ERROR_NOTIFICATION, true); },
  get SEND_ORDER_TO_TOPIC() { return getBoolConfig("SEND_ORDER_TO_TOPIC", process.env.SEND_ORDER_TO_TOPIC, true); },
  get SEND_ORDER_COPY_BUTTONS() { return getBoolConfig("SEND_ORDER_COPY_BUTTONS", process.env.SEND_ORDER_COPY_BUTTONS, true); },
  
  get TELEGRAM_ORDER_TOPIC_ID() { return getTopicId("TELEGRAM_ORDER_TOPIC_ID", process.env.TELEGRAM_ORDER_TOPIC_ID); },
  get TELEGRAM_IMPORT_ORDER_TOPIC_ID() { return getTopicId("TELEGRAM_IMPORT_ORDER_TOPIC_ID", process.env.TELEGRAM_IMPORT_ORDER_TOPIC_ID); },
  get TELEGRAM_FINANCE_TOPIC_ID() { return getTopicId("TELEGRAM_FINANCE_TOPIC_ID", process.env.TELEGRAM_FINANCE_TOPIC_ID, "7009"); },
  get TELEGRAM_RENEWAL_TOPIC_ID() { return getTopicId("TELEGRAM_RENEWAL_TOPIC_ID", process.env.TELEGRAM_RENEWAL_TOPIC_ID, "2"); },
  get ERROR_TOPIC_ID() { return getTopicId("TELEGRAM_SYSTEM_ALERT_TOPIC_ID", process.env.ERROR_TOPIC_ID, "6"); },
  get ZERO_DAYS_TOPIC_ID() { return getTopicId("ZERO_DAYS_TOPIC_ID", process.env.ZERO_DAYS_TOPIC_ID, "2563"); },
  get FOUR_DAYS_TOPIC_ID() { return getTopicId("FOUR_DAYS_TOPIC_ID", process.env.FOUR_DAYS_TOPIC_ID, "12"); },
  get ORDER_CREATED_TOPIC_ID() {
    const orderTopic = getTopicId("TELEGRAM_ORDER_TOPIC_ID", process.env.TELEGRAM_ORDER_TOPIC_ID);
    if (Number.isFinite(orderTopic)) return orderTopic;
    const fourDaysTopic = getTopicId("FOUR_DAYS_TOPIC_ID", process.env.FOUR_DAYS_TOPIC_ID, "12");
    if (Number.isFinite(fourDaysTopic)) return fourDaysTopic;
    return NaN;
  },
};
