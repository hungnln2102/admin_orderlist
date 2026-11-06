const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const Module = require("node:module");

require("module-alias/register");

test("supplier debt settlement does not add import cost a second time", async () => {
  const originalLoad = Module._load;
  const servicePath = require.resolve("@/domains/dashboard/services/dailySummaryService");
  const eventBus = new EventEmitter();
  const notifications = [];
  const EVENTS = {
    ORDER_PAID: "ORDER_PAID",
    BATCH_PAYMENT_COMPLETED: "BATCH_PAYMENT_COMPLETED",
    ORDER_RENEWED: "ORDER_RENEWED",
    SUPPLIER_DEBT_PAID: "SUPPLIER_DEBT_PAID",
    ORDER_CANCELED_REFUNDED: "ORDER_CANCELED_REFUNDED",
    ORDER_IMPORT_CREATED: "ORDER_IMPORT_CREATED",
    ORDER_IMPORT_CANCELED: "ORDER_IMPORT_CANCELED",
    ORDER_PENDING_REFUND: "ORDER_PENDING_REFUND",
  };

  Module._load = (request, parent, isMain) => {
    if (request === "@/db") {
      return {
        db: () => { throw new Error("Supplier settlement must not update daily summary"); },
        TABLES: {},
      };
    }
    if (request === "@/events") return { eventBus, EVENTS };
    if (request === "@/domains/notifications/telegram") {
      return { financeNotifier: { notifyFinanceMonthlyDelta: async (payload) => notifications.push(payload) } };
    }
    if (request === "@/utils/time") {
      return { getVietnamDateString: () => "2026-11-06", getVietnamMonthString: () => "2026-11" };
    }
    if (request === "@/domains/suppliers/utils/supplierCheck") {
      return { isMavrykSupplier: async () => false };
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    delete require.cache[servicePath];
    const { registerDailySummaryListeners } = require(servicePath);
    registerDailySummaryListeners();

    eventBus.emit(EVENTS.SUPPLIER_DEBT_PAID, {
      amount: 120000,
      supplier_name: "NCC 6",
      summary: "Settled supplier debt",
    });
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(notifications, [{
      monthKey: "2026-11",
      bankBalanceDelta: -120000,
      context: "Settled supplier debt",
    }]);
  } finally {
    Module._load = originalLoad;
    delete require.cache[servicePath];
  }
});
