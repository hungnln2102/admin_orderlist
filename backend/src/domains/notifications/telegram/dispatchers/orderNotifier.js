const { enqueueMessage } = require("@/domains/notifications/telegram/core/telegramClient");
const { 
  buildOrderCreatedMessage, 
  buildDueOrderMessage, 
  buildExpiredOrderMessage 
} = require("@/domains/notifications/telegram/builders/orderMessageBuilder");
const { db } = require("@/db");
const { resolveDefaultShopBankAccount } = require("@/services/shopBankAccountResolver");
const { fetchQrImageBytes } = require("@/domains/notifications/telegram/services/qr");
const { 
  ORDER_CREATED_TOPIC_ID, 
  ZERO_DAYS_TOPIC_ID, 
  FOUR_DAYS_TOPIC_ID,
  SEND_ORDER_NOTIFICATION 
} = require("@/domains/notifications/telegram/core/constants");

/**
 * Hàm trừu tượng hóa việc bắn Telegram, giúp dọn dẹp logic trùng lặp (Deduping)
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
        chat_id: require("@/domains/notifications/telegram/core/constants").TELEGRAM_CHAT_ID,
        message_thread_id: topicId,
        text: headerMessage,
        parse_mode: "HTML",
      });
    }

    let defaultBank = null;
    if (includeQR) {
      defaultBank = await resolveDefaultShopBankAccount();
    }

    // 3. Đẩy vào hàng đợi
    for (let i = 0; i < deduped.length; i++) {
      const order = deduped[i];
      const index = i + 1;
      
      const text = messageBuilder(order, index, total);
      
      let qrBuffer = null;
      const price = Number(order.price) || 0;
      
      if (includeQR && defaultBank && price > 0 && defaultBank.accountNumber && (defaultBank.bankShortCode || defaultBank.bankBin)) {
        const qrResult = await fetchQrImageBytes({
          bankCode: defaultBank.bankShortCode || defaultBank.bankBin,
          accountNumber: defaultBank.accountNumber,
          amount: price,
          addInfo: String(order.id_order || order.idOrder || order.order_code || order.orderCode || "").trim(),
          accountName: defaultBank.accountHolder || "",
        }).catch(e => null);
        
        if (qrResult && qrResult.buffer) {
          qrBuffer = qrResult.buffer;
        }
      }

      if (qrBuffer) {
        enqueueMessage({
          chat_id: require("@/domains/notifications/telegram/core/constants").TELEGRAM_CHAT_ID,
          message_thread_id: topicId,
          photo: qrBuffer,
          caption: text,
          parse_mode: "HTML"
        });
      } else {
        enqueueMessage({
          chat_id: require("@/domains/notifications/telegram/core/constants").TELEGRAM_CHAT_ID,
          message_thread_id: topicId,
          text,
          parse_mode: "HTML",
        });
      }
    }
  } catch (error) {
    const logger = require("@/utils/logger");
    logger.error("[OrderNotifier] Lỗi khi sendBulkTelegramOrders", { error: error.message });
  }
}

async function notifyOrderCreated(order) {
  if (!SEND_ORDER_NOTIFICATION) return;

  try {
    let productName = order.id_product;
    if (order.id_product) {
      const prod = await db('product').where('id', order.id_product).first();
      if (prod && prod.package_name) productName = prod.package_name;
    }
    const enrichedOrder = { ...order, productName };
    
    const defaultBank = await resolveDefaultShopBankAccount();
    const text = buildOrderCreatedMessage(enrichedOrder, defaultBank);
    const price = Number(order.price) || 0;
    let qrBuffer = null;
    
    if (price > 0 && defaultBank?.accountNumber && (defaultBank?.bankShortCode || defaultBank?.bankBin)) {
      const qrResult = await fetchQrImageBytes({
        bankCode: defaultBank.bankShortCode || defaultBank.bankBin,
        accountNumber: defaultBank.accountNumber,
        amount: price,
        addInfo: String(order.id_order || order.idOrder || order.order_code || order.orderCode || "").trim(),
        accountName: defaultBank.accountHolder || "",
      }).catch(e => null);
      
      if (qrResult && qrResult.buffer) {
        qrBuffer = qrResult.buffer;
      }
    }
    
    if (qrBuffer) {
      enqueueMessage({
        chat_id: require("@/domains/notifications/telegram/core/constants").TELEGRAM_CHAT_ID,
        message_thread_id: ORDER_CREATED_TOPIC_ID,
        photo: qrBuffer,
        caption: text,
        parse_mode: "HTML"
      });
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
