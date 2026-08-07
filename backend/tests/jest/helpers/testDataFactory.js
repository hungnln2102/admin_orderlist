/**
 * testDataFactory.js — Factory tạo test data chuẩn.
 *
 * Tất cả test data dùng prefix TEST_PREFIX để dễ dàng cleanup.
 * Mỗi factory trả plain object — caller tự insert vào DB khi cần.
 */

const TEST_PREFIX = "MAVCTST";

let _counter = 0;
const uniqueSuffix = () => `${Date.now()}_${++_counter}`;

// ─── Order ────────────────────────────────────────────────
function buildOrder(overrides = {}) {
  const code = `${TEST_PREFIX}${uniqueSuffix()}`;
  return {
    id_order: code,
    price: 250000,
    cost: 150000,
    status: "Chưa Thanh Toán",
    customer: "Jest Tester",
    contact: "0999999999",
    order_date: new Date(),
    ...overrides,
  };
}

// ─── Webhook Payload ──────────────────────────────────────
function buildWebhookPayload(overrides = {}) {
  const now = Date.now();
  return {
    id: now,
    gateway: "MBBank",
    transaction_date: new Date().toISOString().slice(0, 19).replace("T", " "),
    account_number: "0378304963",
    transfer_type: "in",
    transfer_amount: 250000,
    accumulated: 0,
    code: null,
    transaction_content: `MBCT chuyen tien ${TEST_PREFIX}_${now}`,
    reference_number: `TXN${now}`,
    description: "Test webhook payment",
    note: `MBCT chuyen tien ${TEST_PREFIX}_${now}`,
    ...overrides,
  };
}

// ─── Financial Account ────────────────────────────────────
function buildFinancialAccount(overrides = {}) {
  return {
    account_type: "bank",
    bank_display_name: "MBBank",
    account_number: `${TEST_PREFIX}_${uniqueSuffix()}`,
    label: `${TEST_PREFIX} Bank Account`,
    account_holder: "Test Holder",
    balance: 1000000,
    ...overrides,
  };
}

// ─── Ledger Entry ─────────────────────────────────────────
function buildLedgerEntry(financialAccountId, overrides = {}) {
  return {
    financial_account_id: financialAccountId,
    entry_type: "receipt_in",
    amount: 500000,
    signed_amount: 500000,
    balance_after: 1500000,
    source_kind: "payment_receipt",
    source_id: "999",
    note: "Jest test ledger entry",
    ...overrides,
  };
}

// ─── Product Key ──────────────────────────────────────────
function buildProductKey(overrides = {}) {
  return {
    account_username: `${TEST_PREFIX}_user_${uniqueSuffix()}`,
    key_hash: "mock_hash_value",
    key_hint: "mock_hint",
    system_code: "DEFAULT",
    status: "available",
    ...overrides,
  };
}

module.exports = {
  TEST_PREFIX,
  buildOrder,
  buildWebhookPayload,
  buildFinancialAccount,
  buildLedgerEntry,
  buildProductKey,
};
