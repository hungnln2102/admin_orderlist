/**
 * dbCleanup.js — Dọn dẹp test data trong DB sau integration test.
 *
 * Xóa tất cả dữ liệu có prefix MAVTST để tránh ô nhiễm DB dev.
 * Gọi trong beforeAll / afterAll của integration test.
 */

const { TEST_PREFIX } = require("./testDataFactory");

/**
 * Xóa toàn bộ test data khỏi các bảng chính.
 * @param {import("knex").Knex} db - Knex instance
 */
async function cleanUpTestData(db) {
  // 1. Product keys
  await db("business.product_keys")
    .whereILike("account_username", `${TEST_PREFIX}%`)
    .del()
    .catch(() => {});

  await db("business.product_keys")
    .whereILike("id_order", `${TEST_PREFIX}%`)
    .del()
    .catch(() => {});

  // 2. Financial accounts + ledger
  const testAccounts = await db("finance.financial_accounts")
    .whereILike("label", `${TEST_PREFIX}%`)
    .orWhereILike("account_number", `${TEST_PREFIX}%`)
    .select("id")
    .catch(() => []);

  const accountIds = (testAccounts || []).map((a) => a.id);

  if (accountIds.length > 0) {
    await db("finance.financial_account_ledger")
      .whereIn("financial_account_id", accountIds)
      .del()
      .catch(() => {});

    await db("finance.financial_accounts")
      .whereIn("id", accountIds)
      .del()
      .catch(() => {});
  }

  // 3. Orders + receipts + refund credit notes
  const testOrders = await db("business.order_list")
    .whereILike("id_order", `${TEST_PREFIX}%`)
    .orWhereILike("id_order", "MAVNTST%")
    .select("id", "id_order")
    .catch(() => []);
 
  const orderIds = (testOrders || []).map((o) => o.id);
  const orderCodes = (testOrders || []).map((o) => o.id_order);
 
  if (orderIds.length > 0) {
    const receipts = await db("billing.payment_receipt")
      .whereIn("id_order", orderCodes)
      .orWhereILike("note", `%${TEST_PREFIX}%`)
      .select("id")
      .catch(() => []);
 
    const receiptIds = (receipts || []).map((r) => r.id);
 
    if (receiptIds.length > 0) {
      await db("billing.refund_credit_notes")
        .whereIn("payment_receipt_id", receiptIds)
        .del()
        .catch(() => {});
 
      await db("billing.payment_receipt")
        .whereIn("id", receiptIds)
        .del()
        .catch(() => {});
    }

    // Clean up ledger entries referencing these test orders to prevent key reuse collisions
    await db("finance.financial_account_ledger")
      .where("source_kind", "mavn_internal_sync")
      .whereIn("source_id", orderIds)
      .del()
      .catch(() => {});

    // Clean up store profit expenses linked to test order codes
    await db("finance.store_profit_expenses")
      .whereIn("linked_order_code", orderCodes)
      .del()
      .catch(() => {});

    // Clean up supplier order cost logs linked to test order codes
    await db("business.supplier_order_cost_log")
      .whereIn("id_order", orderCodes)
      .del()
      .catch(() => {});
 
    await db("business.order_list")
      .whereIn("id", orderIds)
      .del()
      .catch(() => {});
  }

  // Robust cleanup: Delete any orphan logs/ledgers with test prefix or note to prevent collisions on ID sequence reuse
  await db("finance.financial_account_ledger")
    .whereILike("note", `%${TEST_PREFIX}%`)
    .orWhereILike("note", "%MAVNTST%")
    .del()
    .catch(() => {});

  await db("finance.store_profit_expenses")
    .whereILike("linked_order_code", `${TEST_PREFIX}%`)
    .orWhereILike("linked_order_code", "MAVNTST%")
    .del()
    .catch(() => {});

  await db("business.supplier_order_cost_log")
    .whereILike("id_order", `${TEST_PREFIX}%`)
    .orWhereILike("id_order", "MAVNTST%")
    .del()
    .catch(() => {});
}

module.exports = {
  cleanUpTestData,
};
