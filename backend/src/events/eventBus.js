const EventEmitter = require("events");

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(30);
  }

  async emitAsync(eventName, payload) {
    const listeners = this.listeners(eventName);
    const results = [];

    for (const listener of listeners) {
      results.push(await listener(payload));
    }

    return results;
  }
}

// Instance singleton dùng chung cho toàn hệ thống V2
const eventBus = new EventBus();

module.exports = eventBus;
