const orderNotifier = require("@/domains/notifications/telegram/dispatchers/orderNotifier");
const financeNotifier = require("@/domains/notifications/telegram/dispatchers/financeNotifier");
const systemNotifier = require("@/domains/notifications/telegram/dispatchers/systemNotifier");

module.exports = {
  orderNotifier,
  financeNotifier,
  systemNotifier
};
