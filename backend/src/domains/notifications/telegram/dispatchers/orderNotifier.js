const { enqueueMessage } = require("@/domains/notifications/telegram/core/telegramClient");
const { 
  buildOrderCreatedMessage, 
  buildDueOrderMessage, 
  buildExpiredOrderMessage 
} = require("@/domains/notifications/telegram/builders/orderMessageBuilder");
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

function notifyOrderCreated(order) {
  if (!SEND_ORDER_NOTIFICATION) return;
  const text = buildOrderCreatedMessage(order);
  enqueueMessage({
    chat_id: require("@/domains/notifications/telegram/core/constants").TELEGRAM_CHAT_ID,
    message_thread_id: ORDER_CREATED_TOPIC_ID,
    text,
    parse_mode: "HTML",
  });
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

function notifyOrderRenewed(order) {
  if (!SEND_ORDER_NOTIFICATION) return;
  const text = `✅ <b>GIA HẠN THÀNH CÔNG</b>
📦 <b>Mã Đơn:</b> <code>${order.id_order || order.idOrder || "N/A"}</code>
🛍️ <b>Sản Phẩm:</b> ${order.san_pham || order.sanPham || "N/A"}
⏳ <b>Hết hạn mới:</b> ${order.ngay_het_han_moi || "N/A"}`;

  enqueueMessage({
    chat_id: require("@/domains/notifications/telegram/core/constants").TELEGRAM_CHAT_ID,
    message_thread_id: ORDER_CREATED_TOPIC_ID, // Có thể đổi topic nếu cần
    text,
    parse_mode: "HTML",
  });
}

module.exports = {
  sendOrderCreatedNotification: notifyOrderCreated,
  sendFourDaysRemainingNotification: notifyFourDaysRemaining,
  sendZeroDaysRemainingNotification: notifyZeroDaysRemaining,
  notifyOrderCreated,
  notifyFourDaysRemaining,
  notifyZeroDaysRemaining,
  notifyOrderRenewed
};
