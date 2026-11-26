require("module-alias/register");

const assert = require("node:assert/strict");
const test = require("node:test");
const { TABLES, COLS } = require("../../src/db/tables");

const dbPath = require.resolve("../../src/db");
const { ACCOUNT_SLOTS: SLOT, PRODUCT_NAMES: CATALOG } = COLS;
const catalogs = new Map([
  [1, "example.com/login"],
  [2, "https://example.org/login"],
  [3, "file:///tmp/test"],
  [4, ""],
]);
require.cache[dbPath] = {
  exports: {
    db: (table) => ({
      where(column, id) {
        return {
          async first(field) {
            if (table === TABLES.ACCOUNT_SLOTS) {
              assert.equal(field, SLOT.NAME_ID);
              if (column[SLOT.ACCOUNT_ID] === 10 && column[SLOT.ID] === 20) return { [field]: 2 };
            } else {
              assert.equal(table, TABLES.PRODUCT_NAMES);
              assert.equal(column, CATALOG.ID);
              assert.equal(field, CATALOG.LOGIN_URL);
              if (catalogs.has(id)) return { [field]: catalogs.get(id) };
            }
          },
        };
      },
    }),
  },
};

const sessionsPath = require.resolve("../../src/domains/warehouse/services/cloudBrowserSessions");
const calls = [];
require.cache[sessionsPath] = {
  exports: {
    CloudBrowserError: class extends Error {
      constructor(status, message) {
        super(message);
        this.status = status;
      }
    },
    async openSession(input) {
      calls.push(input);
      return { success: true };
    },
  },
};
const { navigateCloudBrowser } = require("../../src/domains/warehouse/services/cloudBrowserService");

test("cloud browser rejects invalid selectors and invalid stored destinations", async () => {
  await assert.rejects(navigateCloudBrowser({ catalogId: 1, slotId: 20 }), { status: 400 });
  await assert.rejects(navigateCloudBrowser({ accountId: 11, slotId: 20 }), { status: 404 });
  await assert.rejects(navigateCloudBrowser({ catalogId: 99 }), { status: 404 });
  await assert.rejects(navigateCloudBrowser({ catalogId: 3 }), { status: 422 });
  await assert.rejects(navigateCloudBrowser({ catalogId: 4 }), { status: 422 });
});

test("cloud browser selects a persistent profile by warehouse account and separates catalog navigation", async () => {
  await navigateCloudBrowser({ catalogId: "1", url: "https://ignored.example" }, "admin-session");
  await navigateCloudBrowser({ accountId: 10, slotId: 20 }, "admin-session");
  assert.deepEqual(calls.map(({ key, owner, loginUrl, persistent }) => ({ key, owner, loginUrl, persistent })), [
    { key: "catalog", owner: "admin-session", loginUrl: "https://example.com/login", persistent: false },
    { key: "account-10", owner: "admin-session", loginUrl: "https://example.org/login", persistent: true },
  ]);
});
