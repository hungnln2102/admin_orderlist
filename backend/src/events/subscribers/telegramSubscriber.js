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

  // 2. Lắng nghe Event Webhook Tiền Vào (Chuyển khoản bank) -> Bắn Telegram Biến Động Tháng nếu chưa khớp đơn
  eventBus.on(eventTypes.WEBHOOK_MONEY_IN, async (webhookData) => {
    try {
      const isMatched = Boolean(webhookData.payment?.matched);
      console.log(`[TelegramSubscriber] Nhận WEBHOOK_MONEY_IN cho GD ${webhookData.id || webhookData.referenceCode} (Matched: ${isMatched})`);

      // Nếu đơn ĐÃ KHỚP (Auto-match) -> Đã có ORDER_PAID bắn thông báo đầy đủ Doanh thu, Nhập hàng, Lợi nhuận và Số dư bank.
      // Do đó, ta BỎ QUA để không bị double thông báo số dư bank!
      if (isMatched) {
        return;
      }

      // Nếu đơn KHÔNG KHỚP (Biên lai UNALLOCATED) -> Chỉ cộng số dư bank shop, doanh thu/lợi nhuận = 0.
      const amount = Number(webhookData.amount || 0);
      const receiptId = webhookData.payment?.receiptId || webhookData.id;
      const content = webhookData.content || "";
      const { getVietnamMonthString, getVietnamDateString } = require("@/utils/time");
      const dateStr = getVietnamDateString(webhookData.transactionDate);

      if (typeof financeNotifier.notifyFinanceMonthlyDelta === "function") {
        await financeNotifier.notifyFinanceMonthlyDelta({
          monthKey: getVietnamMonthString(dateStr),
          revenueDelta: 0,
          importDelta: 0,
          profitDelta: 0,
          bankBalanceDelta: amount,
          context: `webhook.unmatchedReceipt:#${receiptId}${content ? ` (${content})` : ""}`,
        });
      }
    } catch (err) {
      console.error("[TelegramSubscriber] Lỗi khi xử lý WEBHOOK_MONEY_IN:", err.message);
    }
  });

  // 3. Lắng nghe Event Webhook Tiền Ra (Biến động trừ tiền bank) -> Bắn Telegram trừ số dư bank shop
  eventBus.on(eventTypes.WEBHOOK_MONEY_OUT, async (webhookData) => {
    try {
      const amount = Number(webhookData.amount || 0);
      const receiptId = webhookData.payment?.receiptId || webhookData.id;
      const content = webhookData.content || "";
      console.log(`[TelegramSubscriber] Nhận WEBHOOK_MONEY_OUT cho GD ${webhookData.id || webhookData.referenceCode}: -${amount} ₫`);

      const { getVietnamMonthString, getVietnamDateString } = require("@/utils/time");
      const dateStr = getVietnamDateString(webhookData.transactionDate);

      if (typeof financeNotifier.notifyFinanceMonthlyDelta === "function") {
        await financeNotifier.notifyFinanceMonthlyDelta({
          monthKey: getVietnamMonthString(dateStr),
          revenueDelta: 0,
          importDelta: 0,
          profitDelta: 0,
          bankBalanceDelta: -amount,
          context: `webhook.moneyOut:#${receiptId}${content ? ` (${content})` : ""}`,
        });
      }
    } catch (err) {
      console.error("[TelegramSubscriber] Lỗi khi xử lý WEBHOOK_MONEY_OUT:", err.message);
    }
  });

  // 4. Lắng nghe Event Gia Hạn Thành Công (ORDER_RENEWED) -> Bắn Telegram vào Topic Gia Hạn
  eventBus.on(eventTypes.ORDER_RENEWED, async (renewData) => {
    try {
      console.log(`[TelegramSubscriber] Nhận sự kiện ORDER_RENEWED cho đơn #${renewData.id_order || renewData.orderId}`);
      if (typeof orderNotifier.notifyOrderRenewed === "function") {
        await orderNotifier.notifyOrderRenewed(renewData);
      }
    } catch (err) {
      console.error("[TelegramSubscriber] Lỗi khi xử lý ORDER_RENEWED:", err.message);
    }
  });

  // 5. Lắng nghe Event Thay Đổi Cấu Hình Hệ Thống
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
