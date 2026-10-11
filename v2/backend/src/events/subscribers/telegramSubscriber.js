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

  // 3. Lắng nghe Order Paid -> Gửi Biến Động Tháng (với delta đầy đủ)
  eventBus.on(eventTypes.ORDER_PAID, async (data) => {
    try {
      console.log(`[TelegramSubscriber] Nhận sự kiện ORDER_PAID cho đơn #${data.id_order}`);
      const rev = Number(data.amount || data.price || 0);
      const cost = Number(data.cost || 0);
      const prof = rev - cost;
      await financeNotifier.notifyFinanceMonthlyDelta({
        revenueDelta: rev,
        importDelta: cost,
        profitDelta: prof,
        bankBalanceDelta: rev,
        context: `webhook.orderPaid:${data.id_order}`,
      });
    } catch (err) {
      console.error("[TelegramSubscriber] Lỗi khi xử lý ORDER_PAID finance delta:", err.message);
    }
  });

  // 4. Lắng nghe Order Renewed -> Gửi Biến Động Tháng
  eventBus.on(eventTypes.ORDER_RENEWED, async (data) => {
    try {
      console.log(`[TelegramSubscriber] Nhận sự kiện ORDER_RENEWED cho đơn #${data.id_order}`);
      const rev = Number(data.price || data.amount || 0);
      const cost = Number(data.cost || 0);
      const prof = rev - cost;
      await financeNotifier.notifyFinanceMonthlyDelta({
        revenueDelta: rev,
        profitDelta: prof,
        bankBalanceDelta: rev,
        context: `renewal.orderRenewed:${data.id_order}`,
      });
    } catch (err) {
      console.error("[TelegramSubscriber] Lỗi khi xử lý ORDER_RENEWED finance delta:", err.message);
    }
  });



  // 6. Lắng nghe Order Canceled / Refunded -> Gửi Biến Động Tháng
  eventBus.on(eventTypes.ORDER_CANCELED_REFUNDED, async (data) => {
    try {
      const refund = Number(data.refundAmount || data.price || 0);
      await financeNotifier.notifyFinanceMonthlyDelta({
        refundDelta: refund,
        revenueDelta: -refund,
        profitDelta: -refund,
        bankBalanceDelta: -refund,
        context: `order.canceledRefunded:${data.orderCode || data.id_order}`,
      });
    } catch (err) {
      console.error("[TelegramSubscriber] Lỗi khi xử lý ORDER_CANCELED_REFUNDED finance delta:", err.message);
    }
  });

  // 6b. Lắng nghe Supplier Debt Paid -> Gửi Biến Động Tháng
  eventBus.on(eventTypes.SUPPLIER_DEBT_PAID, async (data) => {
    try {
      const amount = Number(data.amount || 0);
      await financeNotifier.notifyFinanceMonthlyDelta({
        bankBalanceDelta: -amount,
        context: data.summary || `Thanh toán công nợ NCC ${data.supplier_name}: ${amount} đ`,
      });
    } catch (err) {
      console.error("[TelegramSubscriber] Lỗi khi xử lý SUPPLIER_DEBT_PAID finance delta:", err.message);
    }
  });

  // 7. Lắng nghe Event Thay Đổi Cấu Hình Hệ Thống
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
