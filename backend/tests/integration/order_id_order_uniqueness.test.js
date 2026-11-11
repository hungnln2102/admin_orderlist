require("module-alias/register");
const assert = require("node:assert/strict");
const { test, before, after } = require("node:test");
const { db, TABLES } = require("@/db");
const orderService = require("@/domains/orders/services/orderService");

const suffix = Date.now().toString(36).toUpperCase();
const codes = [`MAVCUNIQ${suffix}A`, `MAVCUNIQ${suffix}B`];

before(async () => {
  await db(TABLES.ORDER_LIST).whereIn("id_order", codes).del();
});

after(async () => {
  await db(TABLES.ORDER_LIST).whereIn("id_order", codes).del();
  await db.destroy();
});

function payload(idOrder) {
  return {
    id_order: idOrder,
    customer: "Uniqueness Test",
    price: 0,
    cost: 0,
    status: "UNPAID",
    payment_method: "bank",
  };
}

test("createOrder rejects the same id_order after case and whitespace normalization", async () => {
  const first = await orderService.createOrder(payload(`  ${codes[0].toLowerCase()}  `));
  assert.equal(first.id_order, codes[0]);

  await assert.rejects(
    orderService.createOrder(payload(codes[0].toLowerCase())),
    (error) => error.message === `Mã đơn hàng ${codes[0]} đã tồn tại.`,
  );
});

test("createOrder allows two concurrent requests to create only one order", async () => {
  const results = await Promise.allSettled([
    orderService.createOrder(payload(codes[1])),
    orderService.createOrder(payload(codes[1].toLowerCase())),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  const rejected = results.find((result) => result.status === "rejected");
  assert.match(rejected.reason.message, /đã tồn tại/);

  const rows = await db(TABLES.ORDER_LIST)
    .whereRaw("UPPER(BTRIM(id_order)) = ?", [codes[1]])
    .select("id_order");
  assert.equal(rows.length, 1);
});