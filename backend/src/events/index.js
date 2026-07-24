const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");
const logger = require("@/utils/logger");

// Import your subscribers here when they are created
const { registerTelegramSubscribers } = require("@/events/subscribers/telegramSubscriber");
const { registerSepaySubscribers } = require("@/events/subscribers/sepaySubscriber");
const { registerFinancialMetricsSubscribers } = require("@/events/subscribers/financialMetricsSubscriber");
const { registerWarehouseSubscribers } = require("@/events/subscribers/warehouseSubscriber");

function registerAllSubscribers() {
  logger.info('[EventBus] Registering all subscribers...');

  registerTelegramSubscribers();
  registerSepaySubscribers();
  registerFinancialMetricsSubscribers();
  registerWarehouseSubscribers();
  
  const { subscribeToEvents: registerLedger } = require("@/events/subscribers/financialAllocationLedgerSubscriber");
  registerLedger(eventBus, EVENTS);

  logger.info('[EventBus] All subscribers registered successfully.');
}

module.exports = {
  eventBus,
  EVENTS,
  registerAllSubscribers,
};
