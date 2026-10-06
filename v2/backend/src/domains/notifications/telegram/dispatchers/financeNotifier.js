const { enqueueMessage } = require("@/domains/notifications/telegram/core/telegramClient");
const { TELEGRAM_FINANCE_TOPIC_ID, SEND_FINANCE_DELTA_NOTIFICATION, TELEGRAM_CHAT_ID } = require("@/domains/notifications/telegram/core/constants");

/**
 * Gửi thông báo biến động số dư nội bộ
 */
function notifyFinanceDelta(messageHtml) {
  if (!SEND_FINANCE_DELTA_NOTIFICATION) return;

  enqueueMessage({
    chat_id: TELEGRAM_CHAT_ID,
    message_thread_id: TELEGRAM_FINANCE_TOPIC_ID,
    text: messageHtml,
    parse_mode: "HTML",
  });
}

module.exports = {
  notifyFinanceDelta
};
