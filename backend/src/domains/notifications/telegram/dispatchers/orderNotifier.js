const { enqueueMessage } = require("@/domains/notifications/telegram/core/telegramClient");
const { 
  buildOrderCreatedMessage, 
  buildBatchOrderCreatedMessage,
  buildDueOrderMessage, 
  buildExpiredOrderMessage 
} = require("@/domains/notifications/telegram/builders/orderMessageBuilder");
const { db } = require("@/db");
const { resolveDefaultShopBankAccount } = require("@/services/shopBankAccountResolver");
const { fetchQrImageBytes } = require("@/domains/notifications/telegram/services/qr");
const { 
  TELEGRAM_CHAT_ID,
  ORDER_CREATED_TOPIC_ID, 
  ZERO_DAYS_TOPIC_ID, 
  FOUR_DAYS_TOPIC_ID,
  SEND_ORDER_NOTIFICATION 
} = require("@/domains/notifications/telegram/core/constants");

/**
 * Helper dùng chung: fetch QR (nếu đủ điều kiện) rồi enqueue 1 message vào topic.
 * Nếu QR thành công → gửi ảnh + caption. Nếu không → gửi text thuần.
 *
 * @param {{ topicId: string|number, text: string, bank: object|null, price: number }} opts
 */
async function enqueueOrderMessage({ topicId, text, bank, price }) {
  let qrBuffer = null;

  if (price > 0 && bank?.accountNumber && (bank?.bankShortCode || bank?.bankBin)) {
    const qrResult = await fetchQrImageBytes({
      bankCode: bank.bankShortCode || bank.bankBin,
      accountNumber: bank.accountNumber,
      amount: price,
      accountName: bank.accountHolder || "",
    }).catch(() => null);

    if (qrResult?.buffer) {
      qrBuffer = qrResult.buffer;
    }
  }

  if (qrBuffer) {
    enqueueMessage({
      chat_id: TELEGRAM_CHAT_ID,
      message_thread_id: topicId,
      photo: qrBuffer,
      caption: text,
      parse_mode: "HTML",
    });
  } else {
    enqueueMessage({
      chat_id: TELEGRAM_CHAT_ID,
      message_thread_id: topicId,
      text,
      parse_mode: "HTML",
    });
  }
}

/**
 * Hàm trừu tượng hóa việc bắn Telegram cho nhiều đơn cùng lúc (deduping).
 */
async function sendBulkTelegramOrders(orders = [], config) {
  if (!SEND_ORDER_NOTIFICATION) return;

  try {
    const { topicId, headerMessage, messageBuilder, includeQR } = config;

    // 1. Deduping logic
    const deduped = [];
    const seenCodes = new Set();
    for (const o of orders) {
      const code = String(o?.id_order ?? o?.idOrder ?? "").trim();
      if (code && seenCodes.has(code)) continue;
      if (code) seenCodes.add(code);
      deduped.push(o);
    }

    if (deduped.length === 0) return;

    const total = deduped.length;

    // 2. Gửi Header nếu có
    if (headerMessage) {
      enqueueMessage({
        chat_id: TELEGRAM_CHAT_ID,
        message_thread_id: topicId,
        text: headerMessage,
        parse_mode: "HTML",
      });
    }

    // 3. Resolve bank 1 lần cho cả batch
    const defaultBank = includeQR ? await resolveDefaultShopBankAccount() : null;

    // 4. Đẩy từng đơn vào hàng đợi
    for (let i = 0; i < deduped.length; i++) {
      const order = deduped[i];
      const text = messageBuilder(order, i + 1, total);
      const price = Number(order.price) || 0;

      await enqueueOrderMessage({
        topicId,
        text,
        bank: includeQR ? defaultBank : null,
        price,
      });
    }
  } catch (error) {
    const logger = require("@/utils/logger");
    logger.error("[OrderNotifier] Lỗi khi sendBulkTelegramOrders", { error: error.message });
  }
}

/**
 * Thông báo đơn tạo mới — enrich productName từ DB trước rồi gửi QR.
 */
async function notifyOrderCreated(order) {
  if (!SEND_ORDER_NOTIFICATION) return;

  try {
    // Enrich productName từ DB (đặc thù của flow tạo đơn mới)
    let productName = order.id_product;
    if (order.id_product) {
      const prod = await db("product").where("id", order.id_product).first();
      if (prod?.package_name) productName = prod.package_name;
    }
    const enrichedOrder = { ...order, productName };

    const defaultBank = await resolveDefaultShopBankAccount();
    const text = buildOrderCreatedMessage(enrichedOrder, defaultBank);
    const price = Number(order.price) || 0;

    await enqueueOrderMessage({
      topicId: ORDER_CREATED_TOPIC_ID,
      text,
      bank: defaultBank,
      price,
    });
  } catch (error) {
    const logger = require("@/utils/logger");
    logger.error("[OrderNotifier] Lỗi khi notifyOrderCreated", { error: error.message });
  }
}

function notifyFourDaysRemaining(orders) {
  const total = orders.length;
  sendBulkTelegramOrders(orders, {
    topicId: FOUR_DAYS_TOPIC_ID,
    headerMessage: `☀️ THÔNG BÁO GIA HẠN (7:00 Sáng)\n\nPhát hiện ${total} đơn hàng cần gia hạn (còn 4 ngày):`,
    messageBuilder: buildDueOrderMessage,
    includeQR: true,
  });
}

function notifyZeroDaysRemaining(orders) {
  sendBulkTelegramOrders(orders, {
    topicId: ZERO_DAYS_TOPIC_ID,
    headerMessage: null,
    messageBuilder: buildExpiredOrderMessage,
    includeQR: false,
  });
}

async function notifyBatchCreated(batch, orders) {
  if (!SEND_ORDER_NOTIFICATION) return;

  try {
    const defaultBank = await resolveDefaultShopBankAccount();
    const text = buildBatchOrderCreatedMessage(batch, orders, defaultBank);
    const price = Number(batch.totalAmount) || 0;

    await enqueueOrderMessage({
      topicId: ORDER_CREATED_TOPIC_ID,
      text,
      bank: defaultBank,
      price,
    });
  } catch (error) {
    const logger = require("@/utils/logger");
    logger.error("[OrderNotifier] Lỗi khi notifyBatchCreated", { error: error.message });
  }
}

module.exports = {
  sendOrderCreatedNotification: notifyOrderCreated,
  sendFourDaysRemainingNotification: notifyFourDaysRemaining,
  sendZeroDaysRemainingNotification: notifyZeroDaysRemaining,
  notifyOrderCreated,
  notifyFourDaysRemaining,
  notifyZeroDaysRemaining,
  notifyBatchCreated,
};
