/**
 * Gửi thông báo Telegram khi đơn hàng được tạo (kèm QR nếu có).
 */

const logger = require("../../utils/logger");
const {
  SEND_ORDER_NOTIFICATION,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TELEGRAM_ORDER_TOPIC_ID,
  SEND_ORDER_TO_TOPIC,
  QR_NOTE_PREFIX,
  QR_ACCOUNT_NUMBER,
  QR_BANK_CODE,
  QR_ACCOUNT_NAME,
} = require("./constants");
const { toSafeString, roundGiaBanValue } = require("./formatters");
const { buildOrderCreatedMessage, buildCopyKeyboard } = require("./messageBuilders");
const { buildSepayQrUrl } = require("./qr");
const { sendTelegramMessage, sendTelegramPhoto } = require("./telegramApi");
const { isThreadError, isCopyButtonError } = require("./errorHelpers");

async function sendOrderCreatedNotification(order) {

  logger.info("[Order][Telegram] sendOrderCreatedNotification called", {
    hasOrder: !!order,
    orderId: order?.id || order?.id_order || "N/A",
    SEND_ORDER_NOTIFICATION,
    hasBotToken: !!TELEGRAM_BOT_TOKEN,
    botTokenLength: TELEGRAM_BOT_TOKEN?.length || 0,
    TELEGRAM_CHAT_ID,
    TELEGRAM_ORDER_TOPIC_ID,
    SEND_ORDER_TO_TOPIC,
  });

  if (
    !SEND_ORDER_NOTIFICATION ||
    !order ||
    !TELEGRAM_BOT_TOKEN ||
    !TELEGRAM_CHAT_ID
  ) {
    logger.warn("[Order][Telegram] Notification skipped", {
      reason: !SEND_ORDER_NOTIFICATION
        ? "SEND_ORDER_NOTIFICATION is false"
        : !order
          ? "No order provided"
          : !TELEGRAM_BOT_TOKEN
            ? "No bot token"
            : !TELEGRAM_CHAT_ID
              ? "No chat ID"
              : "Unknown",
      SEND_ORDER_NOTIFICATION,
      hasOrder: !!order,
      hasBotToken: !!TELEGRAM_BOT_TOKEN,
      hasChatId: !!TELEGRAM_CHAT_ID,
    });
    return;
  }

  const orderCode = toSafeString(
    order.id_order || order.idOrder || order.order_code || order.orderCode
  ).trim();
  const paymentNote = `${QR_NOTE_PREFIX} ${orderCode}`.trim();
  const amount = roundGiaBanValue(order.price || 0);
  const qrUrl = buildSepayQrUrl({
    accountNumber: QR_ACCOUNT_NUMBER,
    bankCode: QR_BANK_CODE,
    amount,
    description: paymentNote,
    accountName: QR_ACCOUNT_NAME,
  });
  const caption = buildOrderCreatedMessage(order, paymentNote);

  if (!caption) return;

  const buildPayload = (includeTopic = true, includeButtons = true) => {
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      parse_mode: "HTML",
    };
    if (qrUrl) {
      payload.photo = qrUrl;
      payload.caption = caption;
    } else {
      payload.text = caption;
    }
    if (includeButtons) {
      const keyboard = buildCopyKeyboard({ orderCode, paymentNote });
      if (keyboard) {
        payload.reply_markup = keyboard;
      }
    }
    if (
      includeTopic &&
      SEND_ORDER_TO_TOPIC &&
      Number.isFinite(TELEGRAM_ORDER_TOPIC_ID)
    ) {
      payload.message_thread_id = TELEGRAM_ORDER_TOPIC_ID;
    }
    return payload;
  };

  let includeTopic = true;
  let includeButtons = true;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      logger.info("[Order][Telegram] Sending notification", {
        attempt: attempt + 1,
        hasQrUrl: !!qrUrl,
        includeTopic,
        includeButtons,
        orderCode,
      });

      if (qrUrl) {
        await sendTelegramPhoto(buildPayload(includeTopic, includeButtons));
      } else {
        await sendTelegramMessage(buildPayload(includeTopic, includeButtons));
      }

      logger.info("[Order][Telegram] Notification sent successfully", {
        orderCode,
        attempt: attempt + 1,
      });
      return;
    } catch (err) {
      logger.warn("[Order][Telegram] Send attempt failed", {
        attempt: attempt + 1,
        error: err?.message,
        status: err?.status,
        body: err?.body,
      });

      let adjusted = false;
      if (includeTopic && isThreadError(err)) {
        logger.info("[Order][Telegram] Retrying without topic ID");
        includeTopic = false;
        adjusted = true;
      }
      if (includeButtons && isCopyButtonError(err)) {
        logger.info("[Order][Telegram] Retrying without copy buttons");
        includeButtons = false;
        adjusted = true;
      }
      if (!adjusted) {
        logger.error("[Order][Telegram] Send failed permanently", {
          error: err?.message,
          stack: err?.stack,
          status: err?.status,
          body: err?.body,
        });
        return;
      }
    }
  }
}

module.exports = {
  sendOrderCreatedNotification,
};
