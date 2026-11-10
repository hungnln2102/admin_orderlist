const test = require("node:test");
const assert = require("node:assert/strict");
require("module-alias/register");
const { redact, dispatchStoredEventWith } = require("../../src/events/eventStoreService");

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