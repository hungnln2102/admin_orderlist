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
const { buildSepayQrUrl, fetchQrImageBytes } = require("./qr");
const { resolveDefaultShopBankAccount } = require("../shopBankAccountResolver");
const {
  ensureOrderTransactionForPayment,
} = require("../ensureOrderTransactionForPayment");
const { sendTelegramMessage, sendTelegramPhoto } = require("./telegramApi");
const { sendWithRetry } = require("./sendWithRetry");

async function sendFourDaysRemainingNotification(orders = []) {
  const deduped = [];
  const seenCodes = new Set();
  for (const o of orders) {
    const code = String(o?.id_order ?? o?.idOrder ?? "").trim();
    if (code && seenCodes.has(code)) continue;
    if (code) seenCodes.add(code);
    deduped.push(o);
  }

  logger.info("[Order][Telegram] sendFourDaysRemainingNotification called", {
    ordersCount: orders.length,
    dedupedCount: deduped.length,
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

  if (!deduped.length) {
    logger.info("[Order][Telegram] No orders with 4 days remaining to notify");
    return;
  }

  const total = deduped.length;

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

  const bank = await resolveDefaultShopBankAccount();
  const qrNotePrefix = String(bank.qrNotePrefix || "").trim();

  for (let i = 0; i < deduped.length; i++) {
    const order = deduped[i];
    const index = i + 1;
    const orderCode = toSafeString(
      order.id_order || order.idOrder || order.order_code || order.orderCode
    ).trim();
    let transferCode = "";
    try {
      transferCode = await ensureOrderTransactionForPayment(order);
    } catch (ensureErr) {
      logger.warn("[Order][Telegram] ensure transaction failed — text-only notify", {
        orderCode,
        error: ensureErr?.message,
      });
    }
    if (!transferCode) {
      try {
        const captionOnly = buildDueOrderMessage(order, index, total, bank);
        if (captionOnly) {
          await sendWithRetry(() =>
            sendTelegramMessage({
              chatId: TELEGRAM_CHAT_ID,
              text: captionOnly,
              topicId: FOUR_DAYS_TOPIC_ID,
            })
          );
        }
      } catch (textErr) {
        logger.warn("[Order][Telegram] Due order text-only failed", {
          orderCode,
          error: textErr?.message,
        });
      }
      continue;
    }
    const price = Number(order.price || 0) || 0;
    const paymentNote = [qrNotePrefix, transferCode].filter(Boolean).join(" ").trim();
    const caption = buildDueOrderMessage(order, index, total, bank);
    const qrUrl = buildSepayQrUrl({
      accountNumber: bank.accountNumber,
      bankCode: bank.bankShortCode,
      amount: price,
      description: paymentNote,
      accountName: bank.accountHolder,
    });

    // Pre-fetch QR bytes (xem comment trong sendOrderCreated.js).
    let qrPhotoBuffer = null;
    if (qrUrl) {
      try {
        const fetched = await fetchQrImageBytes({
          amount: price,
          addInfo: paymentNote,
          accountName: bank.accountHolder,
          bankCode: bank.bankShortCode,
          accountNumber: bank.accountNumber,
        });
        if (fetched?.buffer) {
          qrPhotoBuffer = fetched.buffer;
          logger.info("[Order][Telegram] Due order QR fetched as bytes", {
            orderCode,
            source: fetched.sourceUrl,
            cached: !!fetched.cached,
            size: fetched.buffer.length,
          });
        }
      } catch (qrErr) {
        logger.warn("[Order][Telegram] Due order QR fetch failed — text-only", {
          orderCode,
          error: qrErr?.message,
          providerErrors: qrErr?.providerErrors,
        });
      }
    }
    const hasPhoto = Boolean(qrPhotoBuffer);

    const buildPhotoPayload = (includeTopic = true) => {
      const payload = {
        chat_id: TELEGRAM_CHAT_ID,
        photo: qrPhotoBuffer,
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
        hasPhoto && includePhoto
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
      enablePhotoRetry: hasPhoto,
      log: {
        sending: ({ attempt, includeTopic, includePhoto }) =>
          logger.info("[Order][Telegram] Sending due order notification", {
            attempt,
            orderIndex: index,
            total,
            orderCode,
            hasQrBytes: hasPhoto,
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
        attemptFailed: ({ attempt, error, status, body, recoverable }) => {
          const meta = {
            attempt,
            orderIndex: index,
            orderCode,
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
        retryNoPhoto: () =>
          logger.info("[Order][Telegram] Retrying due order as text (QR photo failed)"),
        rateLimited: ({ attempt, retryAfterSeconds, waitMs, body }) =>
          logger.warn("[Order][Telegram] Telegram rate-limited send attempt", {
            attempt,
            orderIndex: index,
            orderCode,
            retryAfterSeconds,
            waitMs,
            body,
          }),
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

    if (i < deduped.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

module.exports = {
  sendFourDaysRemainingNotification,
};
