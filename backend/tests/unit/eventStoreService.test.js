const test = require("node:test");
const assert = require("node:assert/strict");
require("module-alias/register");
const { redact, dispatchStoredEventWith, replayPendingEvents } = require("../../src/events/eventStoreService");

test("replay continues after one event fails and counts successful publications", async (t) => {
  t.mock.method(console, "error", () => {});
  const attempted = [];
  const published = await replayPendingEvents([{ id: 1 }, { id: 2 }], async (event) => {
    attempted.push(event.id);
    if (event.id === 1) throw new Error("subscriber failed");
  });

  assert.deepEqual(attempted, [1, 2]);
  assert.equal(published, 1);
  assert.equal(console.error.mock.callCount(), 1);
});

test("redact removes sensitive nested fields without mutating the source", () => {
  const input = { email: "admin@example.com", password: "secret", nested: { apiKey: "key", safe: true } };
  const result = redact(input);

  assert.equal(result.password, "[REDACTED]");
  assert.equal(result.nested.apiKey, "[REDACTED]");
  assert.equal(result.nested.safe, true);
  assert.equal(input.password, "secret");
});

test("dispatchStoredEventWith publishes and marks pending event after subscriber success", async () => {
  const calls = [];
  const event = { id: 42, event_name: "PRODUCT_UPDATED", payload: { id: 7 }, correlation_id: "corr-1" };

  await dispatchStoredEventWith(event, {
    emitAsync: async (name, payload) => calls.push([name, payload]),
    markPublishedFn: async (id) => calls.push(["published", id]),
    markFailedFn: async () => calls.push(["failed"]),
  });

  assert.equal(calls[0][0], "PRODUCT_UPDATED");
  assert.equal(calls[0][1].auditEventId, 42);
  assert.equal(calls[0][1].correlationId, "corr-1");
  assert.deepEqual(calls[1], ["published", 42]);
});

test("dispatchStoredEventWith keeps failed replay retryable", async () => {
  const calls = [];
  const event = { id: 43, event_name: "PRODUCT_UPDATED", payload: {} };
  const expected = new Error("subscriber failed");

  await assert.rejects(
    dispatchStoredEventWith(event, {
      emitAsync: async () => { throw expected; },
      markPublishedFn: async () => calls.push("published"),
      markFailedFn: async (id, error) => calls.push(["failed", id, error]),
    }),
    expected
  );

  assert.equal(calls[0][0], "failed");
  assert.equal(calls[0][1], 43);
  assert.equal(calls[0][2], expected);
});

test("dispatch rolls back subscriber writes before recording a publication error", async () => {
  const transaction = {};
  const calls = [];
  const error = new Error("could not publish");

  await assert.rejects(
    dispatchStoredEventWith({ id: 44, event_name: "ORDER_RENEWED", payload: {} }, {
      withSavepoint: async (work) => {
        try {
          await work(transaction);
        } catch (failure) {
          calls.push("rolled back");
          throw failure;
        }
      },
      emitAsync: async (name, payload, context) => {
        assert.equal(context.trx, transaction);
        calls.push("subscriber write");
      },
      markPublishedFn: async (id, connection) => {
        assert.equal(id, 44);
        assert.equal(connection, transaction);
        throw error;
      },
      markFailedFn: async (id, failure) => {
        assert.equal(id, 44);
        assert.equal(failure, error);
        calls.push("failure recorded");
      },
    }),
    error
  );

  assert.deepEqual(calls, ["subscriber write", "rolled back", "failure recorded"]);
});
