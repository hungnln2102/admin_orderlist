const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

require("module-alias/register");

const { TABLES, COLS } = require("@/db/tables");
const C = COLS.SYSTEM_CONFIGS;
const O = COLS.NOTIFICATIONS_OUTBOX;
const CONFIG_KEY = "TELEGRAM_ADOBE_MISSING_SUBSCRIPTION_TOPIC_ID";

function loadNotificationFlow(t) {
  const outbox = new Map();
  const config = new Map();
  const changes = [];
  const database = t.mock.fn((table) => {
    if (table === TABLES.SYSTEM_CONFIGS) {
      return { orderBy: () => ({ orderBy: async () => [...config.values()] }) };
    }
    assert.equal(table, TABLES.NOTIFICATIONS_OUTBOX);
    return { where: () => ({ update: async (data) => changes.push(data) }) };
  });
  database.fn = { now: () => "now" };
  database.raw = t.mock.fn(async () => {});
  const outboxTrx = t.mock.fn((table) => {
    assert.equal(table, TABLES.NOTIFICATIONS_OUTBOX);
    return {
      insert(record) {
        return {
          onConflict(column) {
            assert.equal(column, O.IDEMPOTENCY_KEY);
            return {
              ignore: () => ({
                returning: async () => {
                  const key = record[column];
                  if (outbox.has(key)) return [];
                  outbox.set(key, record);
                  return [{ id: outbox.size, status: "PENDING" }];
                },
              }),
            };
          },
        };
      },
    };
  });
  async function withTransaction(callback) {
    let afterCommit;
    const trx = (table) => {
      assert.equal(table, TABLES.SYSTEM_CONFIGS);
      return {
        where(condition, key) {
          if (condition === C.CONFIG_KEY) {
            return { forUpdate: () => ({ first: async () => config.get(key) }) };
          }
          return { update: (row) => ({ returning: async () => {
            const updated = { ...config.get(condition[C.CONFIG_KEY]), ...row };
            config.set(condition[C.CONFIG_KEY], updated);
            return [updated];
          } }) };
        },
        insert: (row) => ({ returning: async () => {
          config.set(row[C.CONFIG_KEY], row);
          return [row];
        } }),
      };
    };
    trx.fn = database.fn;
    trx.afterCommit = (fn) => { afterCommit = fn; };
    const result = await callback(trx);
    afterCommit?.();
    return result;
  }
  const rawPostToTelegram = t.mock.fn(async () => {});
  const originalLoad = Module._load;
  const mockLoad = t.mock.method(Module, "_load", function (request, ...args) {
    if (request === "@/db") return { db: database, TABLES, COLS, withTransaction };
    if (request === "@/events") return {
      publishEventInTrx: async () => {},
      EVENTS: { SYSTEM_CONFIG_UPDATED: "SYSTEM_CONFIG_UPDATED" },
    };
    if (request === "@/domains/notifications/telegram/core/telegramClient") {
      return { rawPostToTelegram, preparePayload: (payload) => payload };
    }
    return originalLoad.call(this, request, ...args);
  });

  const modules = [
    "@/domains/system/services/systemConfigService",
    "@/domains/notifications/telegram/core/constants",
    "@/domains/notifications/hub/notificationHubService",
    "@/domains/notifications/hub/outboxDispatcherWorker",
    "@/domains/notifications/telegram/dispatchers/adobeRecoveryNotifier",
  ];
  modules.forEach((name) => delete require.cache[require.resolve(name)]);
  try {
    const [systemConfigService, , hub, worker, notifier] = modules.map((name) => require(name));
    return { systemConfigService, hub, worker, notifier, outboxTrx, outbox, changes, rawPostToTelegram };
  } finally {
    mockLoad.mock.restore();
  }
}

test("Adobe alerts use the dedicated configured topic, escape content and deduplicate per order and slot", async (t) => {
  const { systemConfigService, hub, notifier, outboxTrx, outbox } = loadNotificationFlow(t);
  const config = (await systemConfigService.getAllConfigs()).find((row) => row.config_key === CONFIG_KEY);
  assert.equal(config.config_value, "");
  assert.equal(config.group_name, "NOTIFY");
  const alert = {
    trx: outboxTrx, orderCode: "AD<&1>", slotId: 15, account: "acct<&>@example.test", replaced: true,
  };
  const eventType = "ADOBE_MISSING_SUBSCRIPTION";
  assert.equal((await notifier.enqueueAdobeMissingSubscription(alert)).reason, "TOPIC_NOT_CONFIGURED");
  assert.equal((await hub.dispatch({
    trx: outboxTrx, eventType, recipient: "123", idempotencyKey: "wrong-topic", renderedContent: "test",
  })).reason, "TOPIC_NOT_CONFIGURED");
  assert.equal(outboxTrx.mock.callCount(), 0);

  assert.throws(() => systemConfigService.set(CONFIG_KEY, "123other"), /số nguyên dương/);
  assert.throws(() => systemConfigService.set(CONFIG_KEY, "-1"), /số nguyên dương/);
  await systemConfigService.set(CONFIG_KEY, " 8123 ");
  const saved = (await systemConfigService.getAllConfigs()).filter((row) => row.config_key === CONFIG_KEY);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].config_value, "8123");
  assert.equal(saved[0].group_name, "NOTIFY");

  assert.equal((await notifier.enqueueAdobeMissingSubscription(alert)).queued, true);
  assert.equal((await notifier.enqueueAdobeMissingSubscription({ ...alert, replaced: false })).reason, "DUPLICATE_IDEMPOTENCY_KEY");
  assert.equal((await notifier.enqueueAdobeMissingSubscription({ ...alert, slotId: 16, replaced: false })).queued, true);
  const [replaced, emptyStock] = [...outbox.values()];
  assert.equal(replaced[O.RECIPIENT], "8123");
  assert.equal(replaced[O.TOPIC_KEY], eventType);
  assert.equal(replaced[O.PAYLOAD], null);
  assert.match(replaced[O.RENDERED_CONTENT], /AD&lt;&amp;1&gt;/);
  assert.match(replaced[O.RENDERED_CONTENT], /acct&lt;&amp;&gt;@example\.test/);
  assert.match(replaced[O.RENDERED_CONTENT], /Đã cấp tài khoản thay thế/);
  assert.match(emptyStock[O.RENDERED_CONTENT], /Kho đã hết tài khoản thay thế/);

  await systemConfigService.set(CONFIG_KEY, "");
  assert.equal((await notifier.enqueueAdobeMissingSubscription({ ...alert, slotId: 17 })).reason, "TOPIC_NOT_CONFIGURED");
});

test("Adobe outbox alerts never send to general when the thread is invalid or missing on Telegram", async (t) => {
  const { worker, changes, rawPostToTelegram } = loadNotificationFlow(t);
  const item = { [O.ID]: 10, [O.EVENT_TYPE]: "ADOBE_MISSING_SUBSCRIPTION", [O.RENDERED_CONTENT]: "test" };

  for (const recipient of [null, "", "0", "-91", "1e2", "invalid"]) {
    const result = await worker.processOutboxItem({ ...item, [O.RECIPIENT]: recipient });
    assert.equal(result.reason, "TOPIC_NOT_CONFIGURED");
    assert.equal(changes.at(-1)[O.STATUS], "CANCELLED");
  }
  assert.equal(rawPostToTelegram.mock.callCount(), 0);

  rawPostToTelegram.mock.mockImplementationOnce(async () => { throw new Error("message thread not found"); });
  const failure = await worker.processOutboxItem({ ...item, [O.RECIPIENT]: "8123" });
  assert.equal(failure.success, false);
  assert.equal(rawPostToTelegram.mock.callCount(), 1);
  assert.equal(rawPostToTelegram.mock.calls[0].arguments[0].message_thread_id, 8123);

  rawPostToTelegram.mock.mockImplementationOnce(async () => { throw new Error("message thread not found"); });
  const fallback = await worker.processOutboxItem({ ...item, [O.EVENT_TYPE]: "SYSTEM_ERROR", [O.RECIPIENT]: "8123" });
  assert.equal(fallback.fallback, true);
  assert.equal(rawPostToTelegram.mock.callCount(), 3);
  assert.equal(rawPostToTelegram.mock.calls[2].arguments[0].message_thread_id, undefined);
});
