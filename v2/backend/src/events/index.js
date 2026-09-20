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

  registerOrderEventSubscribers();
  registerProductEventSubscribers();
  registerSupplierEventSubscribers();
  registerWebhookEventSubscribers();
}


module.exports = {
  eventBus,
  EVENTS,
  recordEvent,
  registerAllSubscribers,
};
