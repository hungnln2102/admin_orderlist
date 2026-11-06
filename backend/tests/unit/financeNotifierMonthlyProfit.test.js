const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

require("module-alias/register");

test("monthly finance notification starts with profit reduced by all monthly obligations", async () => {
  const originalLoad = Module._load;
  const notifierPath = require.resolve("@/domains/notifications/telegram/dispatchers/financeNotifier");
  const messages = [];
  const query = {
    where: () => query,
    sum: () => query,
    first: async () => ({ total_balance: 0 }),
  };

  Module._load = (request, parent, isMain) => {
    if (request === "@/db") return { db: () => query, TABLES: { SHOP_BANK_ACCOUNTS: "finance.financial_accounts" } };
    if (request === "@/domains/notifications/telegram/core/telegramClient") {
      return { enqueueMessage: (payload) => messages.push(payload) };
    }
    if (request === "@/domains/system/services/systemConfigService") return { get: () => null };
    if (request === "@/domains/notifications/telegram/core/constants") {
      return { TELEGRAM_FINANCE_TOPIC_ID: "7009", TELEGRAM_CHAT_ID: "chat" };
    }
    if (request === "@/domains/finance/services/financeHubService") {
      return {
        getFinanceSummary: async () => ({
          breakEven: {
            shopRevenue: 0,
            shopCogs: 0,
            shopRefunds: 0,
            shopGrossProfit: 0,
            netProfit: -15000000,
            totalOperationalExpenses: 0,
            activeFixedCostsTotal: 5000000,
            monthlyDebtBurden: 10000000,
            breakEvenTarget: 15000000,
          },
        }),
      };
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    delete require.cache[notifierPath];
    const { notifyFinanceMonthlyDelta } = require(notifierPath);
    await notifyFinanceMonthlyDelta({ monthKey: "2026-12", context: "month opening" });

    assert.equal(messages.length, 1);
    const message = messages[0].text;
    assert.ok(message.includes("-15.000.000"));
    assert.ok(message.includes("5.000.000"));
    assert.ok(message.includes("10.000.000"));
    assert.ok(message.includes("15.000.000"));
  } finally {
    Module._load = originalLoad;
    delete require.cache[notifierPath];
  }
});
