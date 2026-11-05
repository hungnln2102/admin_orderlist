const eventBus = require("./eventBus");
const EVENTS = require("./eventTypes");
const {
  dispatchPendingEvents,
  publishEventInTrx,
  recordEvent,
  recordEventInTrx,
} = require("./eventStoreService");

function registerAllSubscribers() {
  console.log("[EventBus] Registering subscribers...");

  const { registerOrderEventSubscribers } = require("./subscribers/orderEventSubscriber");
  const { registerProductEventSubscribers } = require("./subscribers/productSubscriber");
  const { registerSupplierEventSubscribers } = require("./subscribers/supplierSubscriber");
  const { registerTelegramSubscriber } = require("./subscribers/telegramSubscriber");
  const { registerWarehouseEventSubscribers } = require("./subscribers/warehouseSubscriber");
  const { registerDailySummaryListeners } = require("@/domains/dashboard/services/dailySummaryService");
  const { registerRealtimeSubscriber } = require("@/domains/realtime/subscribers/realtimeSubscriber");

  registerOrderEventSubscribers();
  registerProductEventSubscribers();
  registerSupplierEventSubscribers();
  registerTelegramSubscriber();
  registerWarehouseEventSubscribers();
  registerDailySummaryListeners();
  registerRealtimeSubscriber();

  dispatchPendingEvents().catch((error) =>
    console.error("[EventStore] Unable to replay pending events:", error.message)
  );
}

module.exports = {
  eventBus,
  EVENTS,
  publishEventInTrx,
  recordEvent,
  recordEventInTrx,
  registerAllSubscribers,
};
