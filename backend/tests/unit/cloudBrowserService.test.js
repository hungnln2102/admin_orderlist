require("module-alias/register");

const assert = require("node:assert/strict");
const test = require("node:test");
const { chromium } = require("playwright");
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

const { navigateCloudBrowser } = require("../../src/domains/warehouse/services/cloudBrowserService");

test("cloud browser rejects invalid selectors and invalid stored destinations", async () => {
  await assert.rejects(navigateCloudBrowser({ catalogId: 1, slotId: 20 }), { status: 400 });
  await assert.rejects(navigateCloudBrowser({ accountId: 11, slotId: 20 }), { status: 404 });
  await assert.rejects(navigateCloudBrowser({ catalogId: 99 }), { status: 404 });
  await assert.rejects(navigateCloudBrowser({ catalogId: 3 }), { status: 422 });
  await assert.rejects(navigateCloudBrowser({ catalogId: 4 }), { status: 422 });
});

test("cloud browser serializes catalog and slot navigation and disconnects each attachment", async (t) => {
  const envKey = "WAREHOUSE_CLOUD_BROWSER_CDP_URL";
  const previousEndpoint = process.env[envKey];
  process.env[envKey] = "ws://cloud-browser:9223/devtools/browser/test";
  t.after(() => {
    if (previousEndpoint === undefined) delete process.env[envKey];
    else process.env[envKey] = previousEndpoint;
  });

  const calls = [];
  t.mock.method(chromium, "connectOverCDP", async (endpoint) => {
    calls.push(endpoint);
    return {
      contexts: () => [{
        pages: () => [{
          bringToFront: async () => calls.push("front"),
          goto: async (url) => calls.push(url),
        }],
      }],
      close: async () => calls.push("disconnect"),
    };
  });
  await Promise.all([
    navigateCloudBrowser({ catalogId: "1", url: "https://ignored.example" }),
    navigateCloudBrowser({ accountId: 10, slotId: 20 }),
  ]);
  assert.deepEqual(calls, [
    process.env[envKey], "front", "https://example.com/login", "disconnect",
    process.env[envKey], "front", "https://example.org/login", "disconnect",
  ]);
});
