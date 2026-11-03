const notificationHubService = require("./hub/notificationHubService");
const outboxDispatcherWorker = require("./hub/outboxDispatcherWorker");
const telegram = require("./telegram");

module.exports = {
  notificationHub: notificationHubService,
  notificationHubService,
  outboxDispatcherWorker,
  telegram,
  ...telegram,
};

