const eventBus = require('./eventBus');
const EVENTS = require('./eventTypes');
const logger = require('../utils/logger');

// Import your subscribers here when they are created
const { registerTelegramSubscribers } = require('./subscribers/telegramSubscriber');
const { registerSepaySubscribers } = require('./subscribers/sepaySubscriber');
const { registerFinancialMetricsSubscribers } = require('./subscribers/financialMetricsSubscriber');

function registerAllSubscribers() {
  logger.info('[EventBus] Registering all subscribers...');

  registerTelegramSubscribers();
  registerSepaySubscribers();
  registerFinancialMetricsSubscribers();

  logger.info('[EventBus] All subscribers registered successfully.');
}

module.exports = {
  eventBus,
  EVENTS,
  registerAllSubscribers,
};
