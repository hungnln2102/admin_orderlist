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
const { sendWithRetry } = require("./sendWithRetry");

async function sendZeroDaysRemainingNotification(orders = []) {

  const deduped = [];
  const seenCodes = new Set();
  for (const o of orders) {
    const code = String(o?.id_order ?? o?.idOrder ?? "").trim();
    if (code && seenCodes.has(code)) continue;
    if (code) seenCodes.add(code);
    deduped.push(o);
  }

  logger.info("[Order][Telegram] sendZeroDaysRemainingNotification called", {
    ordersCount: orders.length,
    dedupedCount: deduped.length,
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

  if (!deduped.length) {
    logger.info("[Order][Telegram] No orders with 0 days remaining to notify");
    return;
  }

  const total = deduped.length;

  for (let i = 0; i < deduped.length; i++) {
    const order = deduped[i];
    const index = i + 1;
    const message = buildExpiredOrderMessage(order, index, total);

    const buildTextPayload = (includeTopic = true) => {
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

    await sendWithRetry({
      buildPayload: ({ includeTopic }) => buildTextPayload(includeTopic),
      sendFn: async (payload) => {
        await sendTelegramMessage(payload);
      },
      maxAttempts: 3,
      log: {
        sending: ({ attempt, includeTopic }) =>
          logger.info("[Order][Telegram] Sending expired order notification", {
            attempt,
            orderIndex: index,
            total,
            orderCode: order.id_order || order.idOrder,
            includeTopic,
          }),
        success: ({ attempt }) =>
          logger.info("[Order][Telegram] Expired order notification sent successfully", {
            attempt,
            orderIndex: index,
            total,
            orderCode: order.id_order || order.idOrder,
          }),
        attemptFailed: ({ attempt, error, status, body, recoverable }) => {
          const meta = {
            attempt,
            orderIndex: index,
            orderCode: order.id_order || order.idOrder,
            error,
            status,
            body,
          };
          if (recoverable) {
            logger.info("[Order][Telegram] Send attempt failed (will retry)", meta);
          } else {
            logger.warn("[Order][Telegram] Send attempt failed", meta);
          }
        },
        retryNoTopic: () =>
          logger.info("[Order][Telegram] Retrying without topic ID"),
        rateLimited: ({ attempt, retryAfterSeconds, waitMs, body }) =>
          logger.warn("[Order][Telegram] Telegram rate-limited send attempt", {
            attempt,
            orderIndex: index,
            orderCode: order.id_order || order.idOrder,
            retryAfterSeconds,
            waitMs,
            body,
          }),
        permanentFailure: ({ error, stack, status, body }) =>
          logger.error("[Order][Telegram] Send failed permanently for order", {
            orderIndex: index,
            orderCode: order.id_order || order.idOrder,
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

    if (i < deduped.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

module.exports = {
  sendZeroDaysRemainingNotification,
};
