const EventEmitter = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    // Increase limit if many modules subscribe to the same events
    this.setMaxListeners(20);
  }
}

// Export a singleton instance so all files share the same Event Bus
const eventBus = new EventBus();

module.exports = eventBus;
