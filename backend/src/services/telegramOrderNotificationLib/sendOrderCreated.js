/**
 * Gửi thông báo Telegram khi đơn hàng được tạo (kèm QR nếu có).
 */

const logger = require("../../utils/logger");
const { isMavnImportOrder } = require("../../utils/orderHelpers");
const {
  SEND_ORDER_NOTIFICATION,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TELEGRAM_ORDER_TOPIC_ID,
  TELEGRAM_IMPORT_ORDER_CHAT_ID,
  TELEGRAM_IMPORT_ORDER_TOPIC_ID,
  SEND_ORDER_TO_TOPIC,
  QR_NOTE_PREFIX,
  QR_ACCOUNT_NUMBER,
  QR_BANK_CODE,
  QR_ACCOUNT_NAME,
} = require("./constants");
const { toSafeString, roundGiaBanValue } = require("./formatters");
const {
  buildOrderCreatedMessage,
  buildImportOrderCreatedMessage,
  buildCopyKeyboard,
} = require("./messageBuilders");
const { buildSepayQrUrl } = require("./qr");
const { sendTelegramMessage, sendTelegramPhoto } = require("./telegramApi");
const { sendWithRetry } = require("./sendWithRetry");

async function sendOrderCreatedNotification(order) {
  const isImport = isMavnImportOrder(order);
  const targetChatId = isImport
    ? TELEGRAM_IMPORT_ORDER_CHAT_ID
    : TELEGRAM_CHAT_ID;

  logger.info("[Order][Telegram] sendOrderCreatedNotification called", {
    hasOrder: !!order,
    orderId: order?.id || order?.id_order || "N/A",
    isImport,
    SEND_ORDER_NOTIFICATION,
    hasBotToken: !!TELEGRAM_BOT_TOKEN,
    botTokenLength: TELEGRAM_BOT_TOKEN?.length || 0,
    targetChatId,
    TELEGRAM_ORDER_TOPIC_ID,
    TELEGRAM_IMPORT_ORDER_TOPIC_ID,
    SEND_ORDER_TO_TOPIC,
  });

  if (!SEND_ORDER_NOTIFICATION || !order || !TELEGRAM_BOT_TOKEN || !targetChatId) {
    logger.warn("[Order][Telegram] Notification skipped", {
      reason: !SEND_ORDER_NOTIFICATION
        ? "SEND_ORDER_NOTIFICATION is false"
        : !order
          ? "No order provided"
          : !TELEGRAM_BOT_TOKEN
            ? "No bot token"
            : !targetChatId
              ? "No chat ID (TELEGRAM_CHAT_ID / TELEGRAM_IMPORT_ORDER_CHAT_ID)"
              : "Unknown",
      SEND_ORDER_NOTIFICATION,
      hasOrder: !!order,
      hasBotToken: !!TELEGRAM_BOT_TOKEN,
      hasChatId: !!targetChatId,
      isImport,
    });
    return;
  }

  const orderCode = toSafeString(
    order.id_order || order.idOrder || order.order_code || order.orderCode
  ).trim();
  const paymentNote = `${QR_NOTE_PREFIX} ${orderCode}`.trim();
  const amount = roundGiaBanValue(order.price || 0);
  const qrUrl = isImport
    ? null
    : buildSepayQrUrl({
        accountNumber: QR_ACCOUNT_NUMBER,
        bankCode: QR_BANK_CODE,
        amount,
        description: paymentNote,
        accountName: QR_ACCOUNT_NAME,
      });
  const caption = isImport
    ? buildImportOrderCreatedMessage(order)
    : buildOrderCreatedMessage(order, paymentNote);

  if (!caption) return;

  const makePayload = ({
    includeTopic,
    includeButtons,
    includePhoto = true,
  }) => {
    const usePhoto = !isImport && includePhoto !== false && !!qrUrl;
    const payload = {
      chat_id: targetChatId,
      parse_mode: "HTML",
    };
    if (usePhoto) {
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
    if (includeTopic) {
      if (
        isImport &&
        Number.isFinite(TELEGRAM_IMPORT_ORDER_TOPIC_ID)
      ) {
        payload.message_thread_id = TELEGRAM_IMPORT_ORDER_TOPIC_ID;
      } else if (
        !isImport &&
        SEND_ORDER_TO_TOPIC &&
        Number.isFinite(TELEGRAM_ORDER_TOPIC_ID)
      ) {
        payload.message_thread_id = TELEGRAM_ORDER_TOPIC_ID;
      }
    }
    return payload;
  };

  await sendWithRetry({
    buildPayload: ({ includeTopic, includeButtons, includePhoto }) =>
      makePayload({ includeTopic, includeButtons, includePhoto }),
    sendFn: async (payload) => {
      if (payload.photo) {
        await sendTelegramPhoto(payload);
      } else {
        await sendTelegramMessage(payload);
      }
    },
    maxAttempts: 5,
    enableCopyButtonRetry: true,
    enablePhotoRetry: Boolean(qrUrl),
    log: {
      sending: ({ attempt, includeTopic, includeButtons, includePhoto }) =>
        logger.info("[Order][Telegram] Sending notification", {
          attempt,
          isImport,
          hasQrUrl: !!qrUrl,
          includeTopic,
          includeButtons,
          includePhoto,
          orderCode,
        }),
      success: ({ attempt }) =>
        logger.info("[Order][Telegram] Notification sent successfully", {
          orderCode,
          attempt,
        }),
      retryNoPhoto: () =>
        logger.info("[Order][Telegram] Retrying as text (QR photo URL failed)"),
      attemptFailed: ({ attempt, error, status, body, recoverable }) => {
        const meta = { attempt, error, status, body };
        if (recoverable) {
          logger.info("[Order][Telegram] Send attempt failed (will retry)", meta);
        } else {
          logger.warn("[Order][Telegram] Send attempt failed", meta);
        }
      },
      retryNoTopic: () =>
        logger.info("[Order][Telegram] Retrying without topic ID"),
      retryNoButtons: () =>
        logger.info("[Order][Telegram] Retrying without copy buttons"),
      rateLimited: ({ attempt, retryAfterSeconds, waitMs, body }) =>
        logger.warn("[Order][Telegram] Telegram rate-limited send attempt", {
          attempt,
          orderCode,
          retryAfterSeconds,
          waitMs,
          body,
        }),
      permanentFailure: ({ error, stack, status, body }) =>
        logger.error("[Order][Telegram] Send failed permanently", {
          error,
          stack,
          status,
          body,
        }),
    },
  });
}

module.exports = {
  sendOrderCreatedNotification,
};
