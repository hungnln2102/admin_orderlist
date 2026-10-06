const { enqueueMessage } = require("@/domains/notifications/telegram/core/telegramClient");
const { ERROR_TOPIC_ID, SEND_ERROR_NOTIFICATION, TELEGRAM_CHAT_ID } = require("@/domains/notifications/telegram/core/constants");

/**
 * Gửi cảnh báo hệ thống hoặc lỗi
 */
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function notifyError(errorOrMessage) {
  if (!SEND_ERROR_NOTIFICATION) return;

  let text;
  if (typeof errorOrMessage === 'string') {
    text = `🚨 <b>System Error</b>\n<code>${escapeHtml(errorOrMessage)}</code>`;
  } else {
    const { message, stack, extra, source } = errorOrMessage;
    const extraInfo = extra ? `\n<i>${escapeHtml(extra)}</i>` : '';
    const srcInfo = source ? ` [${escapeHtml(source)}]` : '';
    text = `🚨 <b>System Error${srcInfo}</b>\n<code>${escapeHtml(message || 'Unknown error')}</code>${extraInfo}`;
    if (stack) {
      text += `\n<pre>${escapeHtml(stack)}</pre>`;
    }
  }

  enqueueMessage({
    chat_id: TELEGRAM_CHAT_ID,
    message_thread_id: ERROR_TOPIC_ID,
    text,
    parse_mode: "HTML",
  }, { isError: true });
}

function notifyWarning(message) {
  if (!SEND_ERROR_NOTIFICATION) return;

  let text;
  if (typeof message === 'string') {
    text = `⚠️ <b>System Warning</b>\n${escapeHtml(message)}`;
  } else {
    const { message: msg, extra, source } = message;
    const extraInfo = extra ? `\n<i>${escapeHtml(extra)}</i>` : '';
    const srcInfo = source ? ` [${escapeHtml(source)}]` : '';
    text = `⚠️ <b>System Warning${srcInfo}</b>\n<code>${escapeHtml(msg || 'Unknown warning')}</code>${extraInfo}`;
  }

  enqueueMessage({
    chat_id: TELEGRAM_CHAT_ID,
    message_thread_id: ERROR_TOPIC_ID,
    text,
    parse_mode: "HTML",
  }, { isError: true });
}

module.exports = {
  notifyError,
  notifyWarning,
  notifyWarn: notifyWarning,
  notifyCritical: notifyError,
  notify: notifyError // fallback
};
