const EventEmitter = require("events");

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(30);
  }
}

// Instance singleton dùng chung cho toàn hệ thống V2
const eventBus = new EventBus();

module.exports = eventBus;
