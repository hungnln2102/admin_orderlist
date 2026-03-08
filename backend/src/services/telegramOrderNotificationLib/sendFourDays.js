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
const { isThreadError } = require("./errorHelpers");

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

    let includeTopic = true;
    let sent = false;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        logger.info("[Order][Telegram] Sending due order notification", {
          attempt: attempt + 1,
          orderIndex: index,
          total,
          orderCode,
          hasQrUrl: !!qrUrl,
          includeTopic,
        });

        if (qrUrl) {
          await sendTelegramPhoto(buildPhotoPayload(includeTopic));
        } else {
          await sendTelegramMessage(buildTextPayload(includeTopic));
        }

        logger.info("[Order][Telegram] Due order notification sent successfully", {
          attempt: attempt + 1,
          orderIndex: index,
          total,
          orderCode,
        });
        sent = true;
        break;
      } catch (err) {
        logger.warn("[Order][Telegram] Send attempt failed", {
          attempt: attempt + 1,
          orderIndex: index,
          orderCode,
          error: err?.message,
          status: err?.status,
          body: err?.body,
        });

        if (includeTopic && isThreadError(err)) {
          logger.info("[Order][Telegram] Retrying without topic ID");
          includeTopic = false;
        } else {
          logger.error("[Order][Telegram] Send failed permanently for order", {
            orderIndex: index,
            orderCode,
            error: err?.message,
            stack: err?.stack,
            status: err?.status,
            body: err?.body,
          });
          break;
        }
      }
    }

    if (!sent) {
      logger.error("[Order][Telegram] Failed to send notification for order", {
        orderIndex: index,
        orderCode: order.id_order || order.idOrder,
      });
    }

    if (i < orders.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

module.exports = {
  sendFourDaysRemainingNotification,
};
