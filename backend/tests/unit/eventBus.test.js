const test = require("node:test");
const assert = require("node:assert/strict");
const EventBus = require("../../src/events/eventBus").constructor;

test("emitAsync waits for every asynchronous subscriber", async () => {
  const eventBus = new EventBus();
  const calls = [];

  eventBus.on("ORDER_CREATED", async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    calls.push("first");
  });
  eventBus.on("ORDER_CREATED", async () => {
    calls.push("second");
  });

  await eventBus.emitAsync("ORDER_CREATED", { id: "order-1" });

  assert.deepEqual(calls, ["first", "second"]);
});

test("emitAsync propagates subscriber failures", async () => {
  const eventBus = new EventBus();
  const expectedError = new Error("subscriber failed");

  eventBus.on("ORDER_UPDATED", async () => {
    throw expectedError;
  });

  await assert.rejects(
    eventBus.emitAsync("ORDER_UPDATED", { id: "order-1" }),
    expectedError
  );
});
