/**
 * Gửi thông báo Telegram cho các đơn có số ngày còn lại = 0 (hết hạn) vào topic.
 */

const logger = require("../../utils/logger");
const {
  SEND_ORDER_NOTIFICATION,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  ZERO_DAYS_TOPIC_ID,
} = require("./constants");
const { buildExpiredOrderMessage } = require("./messageBuilders");
const { sendTelegramMessage } = require("./telegramApi");
const { isThreadError } = require("./errorHelpers");

async function sendZeroDaysRemainingNotification(orders = []) {

  logger.info("[Order][Telegram] sendZeroDaysRemainingNotification called", {
    ordersCount: orders.length,
    hasBotToken: !!TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    ZERO_DAYS_TOPIC_ID,
  });

  if (!SEND_ORDER_NOTIFICATION || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    logger.warn("[Order][Telegram] Zero days notification skipped", {
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
    logger.info("[Order][Telegram] No orders with 0 days remaining to notify");
    return;
  }

  const total = orders.length;

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const index = i + 1;
    const message = buildExpiredOrderMessage(order, index, total);

    const buildPayload = (includeTopic = true) => {
      const payload = {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      };
      if (includeTopic && Number.isFinite(ZERO_DAYS_TOPIC_ID)) {
        payload.message_thread_id = ZERO_DAYS_TOPIC_ID;
      }
      return payload;
    };

    let includeTopic = true;
    let sent = false;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        logger.info("[Order][Telegram] Sending expired order notification", {
          attempt: attempt + 1,
          orderIndex: index,
          total,
          orderCode: order.id_order || order.idOrder,
          includeTopic,
        });

        await sendTelegramMessage(buildPayload(includeTopic));

        logger.info("[Order][Telegram] Expired order notification sent successfully", {
          attempt: attempt + 1,
          orderIndex: index,
          total,
          orderCode: order.id_order || order.idOrder,
        });
        sent = true;
        break;
      } catch (err) {
        logger.warn("[Order][Telegram] Send attempt failed", {
          attempt: attempt + 1,
          orderIndex: index,
          orderCode: order.id_order || order.idOrder,
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
            orderCode: order.id_order || order.idOrder,
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
  sendZeroDaysRemainingNotification,
};
