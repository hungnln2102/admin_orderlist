/**
 * Gửi thông báo Telegram cho các đơn cần gia hạn (còn 4 ngày) vào topic, kèm QR.
 */

const logger = require("../../utils/logger");
const {
  SEND_ORDER_NOTIFICATION,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  FOUR_DAYS_TOPIC_ID,
} = require("./constants");
const { toSafeString } = require("./formatters");
const { buildDueOrderMessage } = require("./messageBuilders");
const { buildVietQrUrl } = require("./qr");
const { sendTelegramMessage, sendTelegramPhoto } = require("./telegramApi");
const { sendWithRetry } = require("./sendWithRetry");

async function sendFourDaysRemainingNotification(orders = []) {

  logger.info("[Order][Telegram] sendFourDaysRemainingNotification called", {
    ordersCount: orders.length,
    hasBotToken: !!TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    FOUR_DAYS_TOPIC_ID,
  });

  if (!SEND_ORDER_NOTIFICATION || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    logger.warn("[Order][Telegram] Four days notification skipped", {
      reason: !SEND_ORDER_NOTIFICATION
        ? "SEND_ORDER_NOTIFICATION is false"
        : !TELEGRAM_BOT_TOKEN
          ? "No bot token"
          : !TELEGRAM_CHAT_ID
            ? "No chat ID"
            : "Unknown",
    });
    return;
  }

  if (!orders || orders.length === 0) {
    logger.info("[Order][Telegram] No orders with 4 days remaining to notify");
    return;
  }

  const total = orders.length;

  try {
    const headerPayload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: `☀️ THÔNG BÁO GIA HẠN (7:00 Sáng) ☀️\n\nPhát hiện ${total} đơn hàng cần gia hạn (còn 4 ngày):`,
    };
    if (Number.isFinite(FOUR_DAYS_TOPIC_ID)) {
      headerPayload.message_thread_id = FOUR_DAYS_TOPIC_ID;
    }
    await sendTelegramMessage(headerPayload);
  } catch (err) {
    logger.warn("[Order][Telegram] Failed sending header message", {
      error: err?.message,
    });
  }

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const index = i + 1;
    const orderCode = toSafeString(
      order.id_order || order.idOrder || order.order_code || order.orderCode
    ).trim();
    const price = Number(order.price || 0) || 0;
    const caption = buildDueOrderMessage(order, index, total);
    const qrUrl = buildVietQrUrl({ amount: price, orderCode });

    const buildPhotoPayload = (includeTopic = true) => {
      const payload = {
        chat_id: TELEGRAM_CHAT_ID,
        photo: qrUrl,
        caption: caption,
      };
      if (includeTopic && Number.isFinite(FOUR_DAYS_TOPIC_ID)) {
        payload.message_thread_id = FOUR_DAYS_TOPIC_ID;
      }
      return payload;
    };

    const buildTextPayload = (includeTopic = true) => {
      const payload = {
        chat_id: TELEGRAM_CHAT_ID,
        text: caption,
      };
      if (includeTopic && Number.isFinite(FOUR_DAYS_TOPIC_ID)) {
        payload.message_thread_id = FOUR_DAYS_TOPIC_ID;
      }
      return payload;
    };

    await sendWithRetry({
      buildPayload: ({ includeTopic, includePhoto = true }) =>
        qrUrl && includePhoto
          ? buildPhotoPayload(includeTopic)
          : buildTextPayload(includeTopic),
      sendFn: async (payload) => {
        if (payload.photo) {
          await sendTelegramPhoto(payload);
        } else {
          await sendTelegramMessage(payload);
        }
      },
      maxAttempts: 5,
      enablePhotoRetry: Boolean(qrUrl),
      log: {
        sending: ({ attempt, includeTopic, includePhoto }) =>
          logger.info("[Order][Telegram] Sending due order notification", {
            attempt,
            orderIndex: index,
            total,
            orderCode,
            hasQrUrl: !!qrUrl,
            includeTopic,
            includePhoto,
          }),
        success: ({ attempt }) =>
          logger.info("[Order][Telegram] Due order notification sent successfully", {
            attempt,
            orderIndex: index,
            total,
            orderCode,
          }),
        attemptFailed: ({ attempt, error, status, body }) =>
          logger.warn("[Order][Telegram] Send attempt failed", {
            attempt,
            orderIndex: index,
            orderCode,
            error,
            status,
            body,
          }),
        retryNoTopic: () =>
          logger.info("[Order][Telegram] Retrying without topic ID"),
        retryNoPhoto: () =>
          logger.info("[Order][Telegram] Retrying due order as text (QR photo failed)"),
        permanentFailure: ({ error, stack, status, body }) =>
          logger.error("[Order][Telegram] Send failed permanently for order", {
            orderIndex: index,
            orderCode,
            error,
            stack,
            status,
            body,
          }),
        finalNotSent: () =>
          logger.error("[Order][Telegram] Failed to send notification for order", {
            orderIndex: index,
            orderCode: order.id_order || order.idOrder,
          }),
      },
    });

    if (i < orders.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

module.exports = {
  sendFourDaysRemainingNotification,
};
