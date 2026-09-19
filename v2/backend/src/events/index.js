const eventBus = require("./eventBus");
const EVENTS = require("./eventTypes");
const { recordEvent, ensureEventStoreTable } = require("./eventStoreService");
const { registerOrderEventSubscribers } = require("./subscribers/orderEventSubscriber");
const { registerProductEventSubscribers } = require("./subscribers/productSubscriber");

function registerAllSubscribers() {
  console.log("⚡ [EventBus] Khởi tạo bảng Event Store & đăng ký tất cả Subscribers...");
  ensureEventStoreTable().catch((err) =>
    console.error("[EventStore] Lỗi đảm bảo bảng event store:", err.message)
  );

  registerOrderEventSubscribers();
  registerProductEventSubscribers();
}

module.exports = {
  eventBus,
  EVENTS,
  recordEvent,
  registerAllSubscribers,
};
