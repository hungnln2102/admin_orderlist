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
  TELEGRAM_IMPORT_ORDER_TOPIC_ID,
  ORDER_CREATED_TOPIC_ID,
  SEND_ORDER_TO_TOPIC,
  SEND_ORDER_COPY_BUTTONS,
} = require("./constants");
const { toSafeString, normalizeExactVnd } = require("./formatters");
const {
  buildOrderCreatedMessage,
  buildImportOrderCreatedMessage,
  buildCopyKeyboard,
} = require("./messageBuilders");
const { buildSepayQrUrl, fetchQrImageBytes } = require("./qr");
const { sendTelegramMessage, sendTelegramPhoto } = require("./telegramApi");
const { sendWithRetry } = require("./sendWithRetry");
const { resolveDefaultShopBankAccount } = require("../shopBankAccountResolver");

async function sendOrderCreatedNotification(order) {
  const isImport = isMavnImportOrder(order);
  const targetChatId = TELEGRAM_CHAT_ID;

  logger.info("[Order][Telegram] sendOrderCreatedNotification called", {
    hasOrder: !!order,
    orderId: order?.id || order?.id_order || "N/A",
    isImport,
    SEND_ORDER_NOTIFICATION,
    hasBotToken: !!TELEGRAM_BOT_TOKEN,
    botTokenLength: TELEGRAM_BOT_TOKEN?.length || 0,
    targetChatId,
    hasDefaultChatId: !!TELEGRAM_CHAT_ID,
    TELEGRAM_ORDER_TOPIC_ID,
    ORDER_CREATED_TOPIC_ID,
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
              ? "No chat ID (TELEGRAM_CHAT_ID)"
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
  const bank = await resolveDefaultShopBankAccount();
  const qrAccountNumber = bank.accountNumber;
  const qrBankCode = bank.bankShortCode;
  const qrAccountName = bank.accountHolder;
  const amount = normalizeExactVnd(order.price || 0);
  const qrUrl = isImport
    ? null
    : buildSepayQrUrl({
        accountNumber: qrAccountNumber,
        bankCode: qrBankCode,
        amount,
        accountName: qrAccountName,
      });
  const caption = isImport
    ? buildImportOrderCreatedMessage(order)
    : buildOrderCreatedMessage(order, bank);

  if (!caption) return;

  // Pre-fetch QR bytes ở backend để không phụ thuộc Telegram đi GET URL
  // (timeout dài, có khi 18s+). Fetch fail → gửi text-only ngay, không chờ.
  let qrPhotoBuffer = null;
  if (!isImport && qrUrl) {
    try {
      const fetched = await fetchQrImageBytes({
        amount,
        accountName: qrAccountName,
        bankCode: qrBankCode,
        accountNumber: qrAccountNumber,
      });
      if (fetched?.buffer) {
        qrPhotoBuffer = fetched.buffer;
        logger.info("[Order][Telegram] QR fetched as bytes", {
          orderCode,
          source: fetched.sourceUrl,
          cached: !!fetched.cached,
          size: fetched.buffer.length,
        });
      }
    } catch (qrErr) {
      logger.warn("[Order][Telegram] QR fetch failed — will send text-only", {
        orderCode,
        error: qrErr?.message,
        providerErrors: qrErr?.providerErrors,
      });
    }
  }
  const hasPhoto = Boolean(qrPhotoBuffer);

  const makePayload = ({
    includeTopic,
    includeButtons,
    includePhoto = true,
  }) => {
    const usePhoto = !isImport && includePhoto !== false && hasPhoto;
    const payload = {
      chat_id: targetChatId,
      parse_mode: "HTML",
    };
    if (usePhoto) {
      payload.photo = qrPhotoBuffer;
      payload.caption = caption;
    } else {
      payload.text = caption;
    }
    if (includeButtons && SEND_ORDER_COPY_BUTTONS) {
      const keyboard = buildCopyKeyboard({ orderCode });
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
        Number.isFinite(ORDER_CREATED_TOPIC_ID)
      ) {
        payload.message_thread_id = ORDER_CREATED_TOPIC_ID;
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
    enablePhotoRetry: hasPhoto,
    log: {
      sending: ({ attempt, includeTopic, includeButtons, includePhoto }) =>
        logger.info("[Order][Telegram] Sending notification", {
          attempt,
          isImport,
          hasQrBytes: hasPhoto,
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
