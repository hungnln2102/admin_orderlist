const eventBus = require("./eventBus");
const EVENTS = require("./eventTypes");
const {
  dispatchPendingEvents,
  publishEventInTrx,
  recordEvent,
  recordEventInTrx,
} = require("./eventStoreService");

const PENDING_RETRY_INTERVAL_MS = 60_000;
let retryTimer;
let replayInProgress = false;

async function replayPendingEvents() {
  if (replayInProgress) return;
  replayInProgress = true;
  try {
    await dispatchPendingEvents();
  } catch (error) {
    console.error("[EventStore] Unable to replay pending events:", error.message);
  } finally {
    replayInProgress = false;
  }
}

function registerAllSubscribers() {
  if (retryTimer) return;
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

  retryTimer = setInterval(replayPendingEvents, PENDING_RETRY_INTERVAL_MS);
  retryTimer.unref();
  void replayPendingEvents();
}

module.exports = {
  eventBus,
  EVENTS,
  publishEventInTrx,
  recordEvent,
  recordEventInTrx,
  registerAllSubscribers,
};
