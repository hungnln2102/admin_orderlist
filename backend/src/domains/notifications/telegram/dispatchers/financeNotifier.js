const { enqueueMessage } = require("../core/telegramClient");
const { TELEGRAM_FINANCE_TOPIC_ID, SEND_FINANCE_DELTA_NOTIFICATION, TELEGRAM_CHAT_ID } = require("../core/constants");

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

/**
 * Báo webhook Sepay nhận tiền thành công
 */
function notifySepayReceived(orderCode, amount) {
  const text = `✅ <b>Sepay Notification</b>\nĐã nhận <b>${amount}đ</b> cho đơn <code>${orderCode}</code>`;
  enqueueMessage({
    chat_id: TELEGRAM_CHAT_ID,
    message_thread_id: TELEGRAM_FINANCE_TOPIC_ID,
    text,
    parse_mode: "HTML",
  });
}

module.exports = {
  notifyFinanceDelta,
  notifySepayReceived
};
