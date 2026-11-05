/**
 * realtimeSubscriber.js
 * Lắng nghe tất cả các Domain Events từ EventBus và đẩy trực tiếp xuống SSE Stream của Admin
 */
const { eventBus, EVENTS } = require("@/events");
const realtimeStreamService = require("../services/realtimeStreamService");

function registerRealtimeSubscriber() {
  const listenedEvents = [
    // 1. Order Events
    EVENTS.ORDER_CREATED,
    EVENTS.ORDER_UPDATED,
    EVENTS.ORDER_DELETED,
    EVENTS.ORDER_PAID,
    EVENTS.ORDER_RENEWED,
    EVENTS.ORDER_EXPIRED,
    EVENTS.ORDER_PENDING_REFUND,
    EVENTS.ORDER_CANCELED_REFUNDED,

    // 2. Supplier Events
    EVENTS.SUPPLIER_CREATED,
    EVENTS.SUPPLIER_UPDATED,
    EVENTS.SUPPLIER_DELETED,
    EVENTS.SUPPLIER_STATUS_TOGGLED,
    EVENTS.SUPPLIER_DEBT_PAID,
    EVENTS.SUPPLIER_COST_ADDED,
    EVENTS.SUPPLIER_COST_UPDATED,
    EVENTS.SUPPLIER_COST_DELETED,

    // 3. Webhook Bank & SePay Events
    EVENTS.WEBHOOK_MONEY_IN,
    EVENTS.WEBHOOK_MONEY_OUT,
    EVENTS.BATCH_PAYMENT_COMPLETED,
    EVENTS.FINANCE_PERSONAL_DEBIT_TRANSACTION_SYNCED,

    // 4. Product & Pricing Events
    EVENTS.PRODUCT_CREATED,
    EVENTS.PRODUCT_UPDATED,
    EVENTS.PRODUCT_DELETED,

    // 5. Warehouse & Stock Events
    EVENTS.WAREHOUSE_STOCK_CREATED,
    EVENTS.WAREHOUSE_STOCK_UPDATED,
    EVENTS.WAREHOUSE_STOCK_DELETED,
    EVENTS.PACKAGE_PRODUCT_CREATED,
    EVENTS.PACKAGE_PRODUCT_UPDATED,
    EVENTS.PACKAGE_PRODUCT_DELETED,
  ];

  for (const eventName of listenedEvents) {
    if (!eventName) continue;
    eventBus.on(eventName, (payload) => {
      try {
        realtimeStreamService.broadcast(eventName, payload);
      } catch (err) {
        console.error(`[RealtimeSubscriber] Lỗi broadcast event ${eventName}:`, err.message);
      }
    });
  }

  console.log("⚡ [EventBus] Realtime SSE Stream Subscriber registered successfully.");
}

module.exports = { registerRealtimeSubscriber };
