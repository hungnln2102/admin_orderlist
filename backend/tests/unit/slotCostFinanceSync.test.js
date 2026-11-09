const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

require("module-alias/register");

test("vacant-slot cost reduces profit without increasing import cost", async () => {
  const originalLoad = Module._load;
  const servicePath = require.resolve("@/domains/warehouse/services/slotCostFinanceSyncService");
  const summaries = [];
  const notifications = [];

  Module._load = (request, parent, isMain) => {
    if (request === "@/domains/dashboard/services/dailySummaryService") {
      return { accumulateDailySummary: async (...args) => summaries.push(args) };
    }
    if (request === "@/domains/notifications/telegram") {
      return { financeNotifier: { notifyFinanceMonthlyDelta: async (payload) => notifications.push(payload) } };
    }
    if (request === "@/utils/time") return { getVietnamMonthString: () => "2026-11" };
    return originalLoad(request, parent, isMain);
  };

  try {
    delete require.cache[servicePath];
    const { syncSlotCostFinanceDelta } = require(servicePath);
    await syncSlotCostFinanceDelta({
      date: "2026-11-09",
      costDelta: 21149.2,
      totalVacantSlots: 19,
      totalVacantCost: 21149.2,
    });

    assert.deepEqual(summaries, [["2026-11-09", { slot_vacant_cost: 21149.2 }]]);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].profitDelta, -21149.2);
    assert.equal("importDelta" in notifications[0], false);
  } finally {
    Module._load = originalLoad;
    delete require.cache[servicePath];
  }
});
