const eventBus = require("./eventBus");
const EVENTS = require("./eventTypes");
const { recordEvent, ensureEventStoreTable } = require("./eventStoreService");
function registerAllSubscribers() {
  console.log("⚡ [EventBus] Khởi tạo bảng Event Store & đăng ký tất cả Subscribers...");
  ensureEventStoreTable().catch((err) =>
    console.error("[EventStore] Lỗi đảm bảo bảng event store:", err.message)
  );

  const { registerOrderEventSubscribers } = require("./subscribers/orderEventSubscriber");
  const { registerProductEventSubscribers } = require("./subscribers/productSubscriber");
  const { registerSupplierEventSubscribers } = require("./subscribers/supplierSubscriber");
  const { registerWebhookEventSubscribers } = require("./subscribers/webhookSubscriber");
  const { registerRefundEventSubscribers } = require("./subscribers/refundSubscriber");
  const { registerTelegramSubscriber } = require("./subscribers/telegramSubscriber");

  registerOrderEventSubscribers();
  registerProductEventSubscribers();
  registerSupplierEventSubscribers();
  registerWebhookEventSubscribers();
  registerRefundEventSubscribers();
  registerTelegramSubscriber();
}


module.exports = {
  eventBus,
  EVENTS,
  recordEvent,
  registerAllSubscribers,
};
