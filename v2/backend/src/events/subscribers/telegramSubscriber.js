/**
 * telegramSubscriber.js (V2)
 * Event Subscriber lắng nghe các sự kiện hệ thống và gửi thông báo Telegram tự động
 */

const eventBus = require("@/events/eventBus");
const eventTypes = require("@/events/eventTypes");
const { orderNotifier, financeNotifier, systemNotifier } = require("@/domains/notifications/telegram");

function registerTelegramSubscriber() {
  // 1. Lắng nghe Event Đơn Hàng Mới -> Bắn Telegram
  eventBus.on(eventTypes.ORDER_CREATED, async (orderData) => {
    try {
      console.log(`[TelegramSubscriber] Nhận sự kiện ORDER_CREATED cho đơn #${orderData.id_order || orderData.id}`);
      await orderNotifier.notifyOrderCreated(orderData);
    } catch (err) {
      console.error("[TelegramSubscriber] Lỗi khi xử lý ORDER_CREATED:", err.message);
    }
  });

  // 2. Lắng nghe Event Webhook Tiền Vào (Chuyển khoản bank) -> Bắn Telegram
  eventBus.on(eventTypes.WEBHOOK_MONEY_IN, async (webhookData) => {
    try {
      console.log(`[TelegramSubscriber] Nhận sự kiện WEBHOOK_MONEY_IN cho GD ${webhookData.transaction_id || webhookData.id}`);
      if (typeof financeNotifier.notifySepayReceived === 'function') {
        await financeNotifier.notifySepayReceived(webhookData);
      }
    } catch (err) {
      console.error("[TelegramSubscriber] Lỗi khi xử lý WEBHOOK_MONEY_IN:", err.message);
    }
  });

  // 3. Lắng nghe Event Thay Đổi Cấu Hình Hệ Thống
  eventBus.on(eventTypes.SYSTEM_CONFIG_UPDATED, async (configData) => {
    try {
      console.log(`[TelegramSubscriber] Nhận sự kiện SYSTEM_CONFIG_UPDATED: ${configData.summary}`);
      if (typeof systemNotifier?.notifyCritical === 'function') {
        systemNotifier.notifyCritical(`⚙️ [SYSTEM CONFIG] ${configData.summary}`);
      }
    } catch (err) {
      console.error("[TelegramSubscriber] Lỗi khi xử lý SYSTEM_CONFIG_UPDATED:", err.message);
    }
  });

  console.log("✅ [EventBus] Telegram Event Subscriber registered successfully.");
}

module.exports = { registerTelegramSubscriber };
