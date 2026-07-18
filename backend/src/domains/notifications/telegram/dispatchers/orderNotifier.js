const { enqueueMessage } = require("@/domains/notifications/telegram/core/telegramClient");
const { 
  buildOrderCreatedMessage, 
  buildDueOrderMessage, 
  buildExpiredOrderMessage 
} = require("@/domains/notifications/telegram/builders/orderMessageBuilder");
const { db } = require("@/db");
const { resolveDefaultShopBankAccount } = require("@/services/shopBankAccountResolver");
const { fetchQrImageBytes } = require("@/domains/notifications/telegram/services/qr");
const FormData = require("form-data");
const { 
  ORDER_CREATED_TOPIC_ID, 
  ZERO_DAYS_TOPIC_ID, 
  FOUR_DAYS_TOPIC_ID,
  SEND_ORDER_NOTIFICATION 
} = require("@/domains/notifications/telegram/core/constants");

/**
 * Hàm trừu tượng hóa việc bắn Telegram, giúp dọn dẹp logic trùng lặp (Deduping)
 */
function sendBulkTelegramOrders(orders = [], config) {
  if (!SEND_ORDER_NOTIFICATION) return;

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
      chat_id: require("@/domains/notifications/telegram/core/constants").TELEGRAM_CHAT_ID,
      message_thread_id: topicId,
      text: headerMessage,
      parse_mode: "HTML",
    });
  }

  // 3. Đẩy vào hàng đợi
  for (let i = 0; i < deduped.length; i++) {
    const order = deduped[i];
    const index = i + 1;
    
    // Giả sử có logic QR ở đây nếu includeQR, 
    // tạm thời đơn giản hóa dùng sendMessage cho text HTML
    const text = messageBuilder(order, index, total);
    enqueueMessage({
      chat_id: require("@/domains/notifications/telegram/core/constants").TELEGRAM_CHAT_ID,
      message_thread_id: topicId,
      text,
      parse_mode: "HTML",
    });
  }
}

async function notifyOrderCreated(order) {
  if (!SEND_ORDER_NOTIFICATION) return;

  try {
    let productName = order.id_product;
    if (order.id_product) {
      const prod = await db('product').where('id', order.id_product).first();
      if (prod && prod.name) productName = prod.name;
    }
    const enrichedOrder = { ...order, productName };
    
    const defaultBank = await resolveDefaultShopBankAccount();
    const text = buildOrderCreatedMessage(enrichedOrder, defaultBank);
    const price = Number(order.price) || 0;
    let qrBuffer = null;
    
    if (price > 0 && defaultBank?.accountNumber && defaultBank?.bankCode) {
      const qrResult = await fetchQrImageBytes({
        bank: defaultBank.bankCode,
        acc: defaultBank.accountNumber,
        amount: price,
        desc: String(order.id_order || "").trim(),
        name: defaultBank.accountHolder || "",
      }).catch(e => null);
      
      if (qrResult && qrResult.buffer) {
        qrBuffer = qrResult.buffer;
      }
    }
    
    if (qrBuffer) {
      const form = new FormData();
      form.append("chat_id", require("@/domains/notifications/telegram/core/constants").TELEGRAM_CHAT_ID);
      form.append("message_thread_id", ORDER_CREATED_TOPIC_ID);
      form.append("photo", qrBuffer, { filename: "qr.png", contentType: "image/png" });
      form.append("caption", text);
      form.append("parse_mode", "HTML");
      enqueueMessage(form);
    } else {
      enqueueMessage({
        chat_id: require("@/domains/notifications/telegram/core/constants").TELEGRAM_CHAT_ID,
        message_thread_id: ORDER_CREATED_TOPIC_ID,
        text,
        parse_mode: "HTML",
      });
    }
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
    includeQR: true
  });
}

function notifyZeroDaysRemaining(orders) {
  sendBulkTelegramOrders(orders, {
    topicId: ZERO_DAYS_TOPIC_ID,
    headerMessage: null,
    messageBuilder: buildExpiredOrderMessage,
    includeQR: false
  });
}



module.exports = {
  sendOrderCreatedNotification: notifyOrderCreated,
  sendFourDaysRemainingNotification: notifyFourDaysRemaining,
  sendZeroDaysRemainingNotification: notifyZeroDaysRemaining,
  notifyOrderCreated,
  notifyFourDaysRemaining,
  notifyZeroDaysRemaining
};
