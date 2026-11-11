const test = require("node:test");
const assert = require("node:assert/strict");
require("module-alias/register");

const { db, TABLES } = require("@/db");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { payOrderWithCredit } = require("@/domains/orders/services/orderCreditService");

const createdOrderIds = [];
const createdCreditIds = [];
const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function createOrder(price) {
  const [order] = await db(TABLES.ORDER_LIST)
    .insert({
      id_order: `MAVCQA${stamp()}`,
      customer: "QA Trust Flow",
      price,
      cost: 0,
      status: ORDER_STATUS.UNPAID,
      days: 30,
      expired_at: "2026-12-31",
      information_order: "Dữ liệu giả lập nghiệm thu Credit",
    })
    .returning("*");
  createdOrderIds.push(order.id);
  return order;
}

async function createCredit(amount) {
  const [credit] = await db(TABLES.REFUND_CREDIT_NOTES)
    .insert({
      credit_code: `QA-CREDIT-${stamp()}`,
      customer_name: "QA Trust Flow",
      refund_amount: amount,
      available_amount: amount,
      status: "OPEN",
      source_kind: "QA_TEST",
    })
    .returning("*");
  createdCreditIds.push(credit.id);
  return credit;
}

test.after(async () => {
  await db(TABLES.REFUND_CREDIT_APPLICATIONS).whereIn("credit_note_id", createdCreditIds).del();
  await db(TABLES.REFUND_CREDIT_NOTES).whereIn("id", createdCreditIds).del();
  await db(TABLES.ORDER_LIST).whereIn("id", createdOrderIds).del();
  await db.destroy();
});

test("Credit đủ tiền chuyển đơn sang PAID và trừ đúng số dư", async () => {
  const order = await createOrder(100000);
  const credit = await createCredit(100000);
  const result = await payOrderWithCredit(order.id, credit.id);

  assert.equal(result.status, ORDER_STATUS.PAID);
  assert.equal(Number(result.credit_paid_amount), 100000);
  const storedCredit = await db(TABLES.REFUND_CREDIT_NOTES).where({ id: credit.id }).first();
  assert.equal(Number(storedCredit.available_amount), 0);
  assert.equal(storedCredit.status, "FULLY_APPLIED");
});

test("Credit thiếu tiền trừ phần có và trả QR phần còn thiếu", async () => {
  const order = await createOrder(100000);
  const credit = await createCredit(60000);
  const result = await payOrderWithCredit(order.id, credit.id);

  assert.equal(result.partial, true);
  assert.equal(result.status, ORDER_STATUS.UNPAID);
  assert.equal(Number(result.appliedAmount), 60000);
  assert.equal(Number(result.remainingAmount), 40000);
  assert.match(result.vietqr_url, /amount=40000/);

  const storedCredit = await db(TABLES.REFUND_CREDIT_NOTES).where({ id: credit.id }).first();
  assert.equal(Number(storedCredit.available_amount), 0);
  assert.equal(storedCredit.status, "FULLY_APPLIED");
});