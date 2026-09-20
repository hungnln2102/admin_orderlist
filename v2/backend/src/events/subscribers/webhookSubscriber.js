const eventBus = require("../eventBus");
const EVENTS = require("../eventTypes");
const { processPaymentWebhook } = require("@/domains/payments/services/webhookPaymentService");

/**
 * Đăng ký các Subscribers lắng nghe Sự kiện Webhook (Money In & Money Out)
 */
function registerWebhookEventSubscribers() {
  // Lắng nghe sự kiện WEBHOOK_MONEY_IN (Tiền vào)
  eventBus.on(EVENTS.WEBHOOK_MONEY_IN, async (data) => {
    try {
      console.log(`📥 [Subscriber] Nhận sự kiện WEBHOOK_MONEY_IN - Số tiền: ${data.amount} ₫`);
      const result = await processPaymentWebhook(data);
      if (result.matched) {
        console.log(`🎉 [Subscriber] Đã tự động khớp và thanh toán thành công đơn #${result.id_order}`);
      }
    } catch (err) {
      console.error("❌ [Subscriber] Lỗi khi xử lý WEBHOOK_MONEY_IN:", err);
    }
  });

  // Lắng nghe sự kiện WEBHOOK_MONEY_OUT (Tiền ra)
  eventBus.on(EVENTS.WEBHOOK_MONEY_OUT, async (data) => {
    try {
      console.log(`📤 [Subscriber] Nhận sự kiện WEBHOOK_MONEY_OUT - Số tiền: ${data.amount} ₫ - Nội dung: "${data.content}"`);
      // Dự phòng cho luồng xử lý chi phí / thanh toán nhà cung cấp tự động
    } catch (err) {
      console.error("❌ [Subscriber] Lỗi khi xử lý WEBHOOK_MONEY_OUT:", err);
    }
  });
}

module.exports = {
  registerWebhookEventSubscribers,
};
