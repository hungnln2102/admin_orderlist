const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

require("module-alias/register");

test("zero-day notification only selects renew-required orders", async () => {
  const originalLoad = Module._load;
  const taskPath = require.resolve("@/scheduler/tasks/notifyZeroDaysTask");
  const rawCalls = [];
  const notifiedBatches = [];
  const ORDER_STATUS = { RENEW_REQUIRED: "RENEW_REQUIRED", EXPIRED: "EXPIRED" };

  Module._load = (request, parent, isMain) => {
    if (request === "@/db") {
      return {
        TABLES: { ORDER_LIST: "business.order_list" },
        db: {
          raw: async (sql, bindings) => {
            rawCalls.push({ sql, bindings });
            return { rows: [{ id_order: "RENEW-0", status: ORDER_STATUS.RENEW_REQUIRED }] };
          },
        },
      };
    }
    if (request === "@/constants/orderStatus") return { ORDER_STATUS };
    if (request === "@/domains/system/services/systemConfigService") return { get: () => true };
    if (request === "../withAdvisoryLock") return { withAdvisoryLock: async (_name, handler) => handler() };
    if (request === "@/domains/notifications/telegram/dispatchers/orderNotifier") {
      return { notifyZeroDaysRemaining: async (orders) => notifiedBatches.push(orders) };
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    delete require.cache[taskPath];
    const { notifyZeroDaysTask } = require(taskPath);
    const result = await notifyZeroDaysTask("test");

    assert.equal(result.count, 1);
    assert.deepEqual(rawCalls[0].bindings, [ORDER_STATUS.RENEW_REQUIRED]);
    assert.match(rawCalls[0].sql, /AND status = \?/);
    assert.doesNotMatch(rawCalls[0].sql, /EXPIRED/);
    assert.deepEqual(notifiedBatches, [[{ id_order: "RENEW-0", status: ORDER_STATUS.RENEW_REQUIRED }]]);
  } finally {
    Module._load = originalLoad;
    delete require.cache[taskPath];
  }
});
