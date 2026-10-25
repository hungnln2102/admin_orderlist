/**
 * webhook_receipt.test.js (V2) — Integration Test Suite
 * QA Agent kiểm tra toàn bộ luồng Biên lai - Đơn hàng:
 *
 * [TC-01] Webhook tiền vào → Khớp đơn UNPAID → Đơn chuyển sang PAID, Biên lai FULLY_ALLOCATED
 * [TC-02] Webhook tiền vào → Khớp đơn GIA HẠN → Đơn chuyển sang PAID, expired_at được cộng thêm
 * [TC-03] Webhook tiền vào → Không khớp đơn nào → Biên lai giữ nguyên UNALLOCATED
 * [TC-04] Webhook trùng lặp (Idempotency) → Trả về duplicate=true, KHÔNG tạo Biên lai mới
 * [TC-05] Webhook tiền ra (OUT) → Chỉ lưu Biên lai, matched=false
 */
const path = require("path");
require("module-alias/register");
// Nạp đúng .env của v2/backend — tránh nạp nhầm .env gốc project (trỏ VPS)
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { db, TABLES } = require("@/db");
const { processPaymentWebhook } = require("@/domains/payments/services/webhookPaymentService");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { RECEIPT_STATUS, TRANSFER_TYPE } = require("@/constants/receiptStatus");

// ────────────── Helpers ──────────────

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n) + " ₫";
const stamp = () => `TEST-${Date.now()}`;
let PASS = 0;
let FAIL = 0;
const createdReceiptIds = [];
const createdOrderIds = [];

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERT FAIL: ${message}`);
}

async function createTestOrder(overrides = {}) {
  const [res] = await db(TABLES.ORDER_LIST)
    .insert({
      id_order: overrides.id_order || stamp(),
      customer: overrides.customer || "Khách Test",
      price: overrides.price ?? 199000,
      status: overrides.status ?? ORDER_STATUS.UNPAID,
      days: overrides.days ?? 30,
      expired_at: overrides.expired_at ?? null,
      information_order: "Đơn hàng test tự động",
    })
    .returning("*");
  createdOrderIds.push(res.id);
  return res;
}

async function cleanup() {
  if (createdReceiptIds.length) {
    await db(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).whereIn("receipt_id", createdReceiptIds).del();
    await db(TABLES.PAYMENT_RECEIPT).whereIn("id", createdReceiptIds).del();
  }
  if (createdOrderIds.length) {
    await db(TABLES.ORDER_LIST).whereIn("id", createdOrderIds).del();
  }
}

async function runTest(name, fn) {
  process.stdout.write(`  ⏳ ${name}... `);
  try {
    await fn();
    console.log("✅ PASS");
    PASS++;
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}`);
    FAIL++;
  }
}

// ────────────── Test Cases ──────────────

async function tc01_webhookMatchUnpaidOrder() {
  const order = await createTestOrder({ status: ORDER_STATUS.UNPAID, price: 250000 });
  const txId = Date.now();

  const result = await processPaymentWebhook({
    id: txId,
    transferAmount: 250000,
    transferType: TRANSFER_TYPE.IN,
    content: `Thanh toan don hang ${order.id_order}`,
    gateway: "MBBANK",
    accountNumber: "0331000123456",
    transactionDate: "2026-10-06",
  });
  createdReceiptIds.push(result.receiptId);

  assert(result.success === true, `result.success phải là true, nhận: ${result.success}`);
  assert(result.matched === true, `result.matched phải là true, nhận: ${result.matched}`);

  const updatedOrder = await db(TABLES.ORDER_LIST).where({ id: order.id }).first();
  assert(updatedOrder.status === ORDER_STATUS.PAID, `Trạng thái đơn phải là PAID, nhận: ${updatedOrder.status}`);

  const receipt = await db(TABLES.PAYMENT_RECEIPT).where({ id: result.receiptId }).first();
  assert(receipt.status === RECEIPT_STATUS.FULLY_ALLOCATED, `Biên lai phải FULLY_ALLOCATED, nhận: ${receipt.status}`);
}

async function tc02_webhookMatchRenewalOrder() {
  const pastExpiry = "2026-09-01"; // Đã hết hạn
  const order = await createTestOrder({
    status: ORDER_STATUS.RENEW_REQUIRED,
    price: 180000,
    days: 30,
    expired_at: pastExpiry,
  });
  const txId = Date.now() + 1;

  const result = await processPaymentWebhook({
    id: txId,
    transferAmount: 180000,
    transferType: TRANSFER_TYPE.IN,
    content: `Gia han don ${order.id_order}`,
    gateway: "VCB",
    transactionDate: "2026-10-06",
  });
  createdReceiptIds.push(result.receiptId);

  assert(result.matched === true, `Phải khớp đơn gia hạn, nhận: ${result.matched}`);
  assert(result.isRenewal === true, `isRenewal phải là true, nhận: ${result.isRenewal}`);

  const updatedOrder = await db(TABLES.ORDER_LIST).where({ id: order.id }).first();
  assert(updatedOrder.status === ORDER_STATUS.PAID, `Trạng thái đơn phải PAID, nhận: ${updatedOrder.status}`);
  assert(updatedOrder.expired_at !== null, "expired_at phải được cập nhật sau gia hạn");
  assert(updatedOrder.expired_at !== pastExpiry, `expired_at phải được gia hạn, vẫn còn: ${updatedOrder.expired_at}`);
}

async function tc03_webhookNoMatchingOrder() {
  const txId = Date.now() + 2;
  const unmatchedAmount = 77777777;

  const result = await processPaymentWebhook({
    id: txId,
    transferAmount: unmatchedAmount,
    transferType: TRANSFER_TYPE.IN,
    content: "Chuyen tien khong ro noi dung",
    gateway: "TCB",
    transactionDate: "2026-10-06",
  });
  createdReceiptIds.push(result.receiptId);

  assert(result.success === true, `success phải là true, nhận: ${result.success}`);
  assert(result.matched === false, `matched phải là false, nhận: ${result.matched}`);

  const receipt = await db(TABLES.PAYMENT_RECEIPT).where({ id: result.receiptId }).first();
  assert(receipt !== null, "Biên lai phải được tạo dù không khớp đơn");
  assert(receipt.status === RECEIPT_STATUS.UNALLOCATED, `Biên lai phải UNALLOCATED, nhận: ${receipt.status}`);
  assert(Number(receipt.unallocated_amount) === unmatchedAmount, `unallocated_amount phải bằng ${fmt(unmatchedAmount)}, nhận: ${fmt(receipt.unallocated_amount)}`);
}

async function tc04_webhookIdempotency() {
  const txId = Date.now() + 3;
  const price = 120000;

  // Gửi lần đầu
  const first = await processPaymentWebhook({
    id: txId,
    transferAmount: price,
    transferType: TRANSFER_TYPE.IN,
    content: "Thanh toan thu nhat",
    gateway: "ACB",
  });
  createdReceiptIds.push(first.receiptId);

  // Gửi lại chính xác webhook đó
  const second = await processPaymentWebhook({
    id: txId,
    transferAmount: price,
    transferType: TRANSFER_TYPE.IN,
    content: "Thanh toan thu nhat",
    gateway: "ACB",
  });

  assert(second.duplicate === true, `Lần 2 phải là duplicate=true, nhận: ${second.duplicate}`);
  assert(second.receiptId === first.receiptId, `Receipt ID phải trùng nhau: ${first.receiptId} vs ${second.receiptId}`);

  const count = await db(TABLES.PAYMENT_RECEIPT).where("sepay_transaction_id", String(txId)).count("id as count").first();
  assert(Number(count.count) === 1, `Phải chỉ có 1 Biên lai cho txId ${txId}, nhận: ${count.count}`);
}

async function tc05_webhookMoneyOut() {
  const txId = Date.now() + 4;

  const result = await processPaymentWebhook({
    id: txId,
    transferAmount: 500000,
    transferType: TRANSFER_TYPE.OUT,
    content: "Chuyen tien cho NCC",
    gateway: "BIDV",
  });
  createdReceiptIds.push(result.receiptId);

  assert(result.success === true, `success phải là true, nhận: ${result.success}`);
  assert(result.matched === false, `Tiền ra không khớp đơn, nhận: ${result.matched}`);

  const receipt = await db(TABLES.PAYMENT_RECEIPT).where({ id: result.receiptId }).first();
  assert(receipt.transfer_type === TRANSFER_TYPE.OUT, `transfer_type phải là 'out', nhận: ${receipt.transfer_type}`);
  assert(Number(receipt.unallocated_amount) === 0, `unallocated_amount tiền ra phải là 0, nhận: ${receipt.unallocated_amount}`);
}

// ────────────── Main Runner ──────────────

async function main() {
  console.log("\n🧪 [QA Agent] Bắt đầu chạy Integration Test — Luồng Biên Lai & Đơn Hàng (V2)\n");

  await runTest("[TC-01] Webhook tiền vào → Khớp đơn UNPAID → Đơn sang PAID, Biên lai FULLY_ALLOCATED", tc01_webhookMatchUnpaidOrder);
  await runTest("[TC-02] Webhook tiền vào → Khớp đơn GIA HẠN → expired_at được cộng thêm", tc02_webhookMatchRenewalOrder);
  await runTest("[TC-03] Webhook tiền vào → Không khớp đơn → Biên lai giữ UNALLOCATED", tc03_webhookNoMatchingOrder);
  await runTest("[TC-04] Webhook trùng lặp (Idempotency) → duplicate=true, KHÔNG tạo Biên lai mới", tc04_webhookIdempotency);
  await runTest("[TC-05] Webhook tiền ra (OUT) → Lưu Biên lai, matched=false, unallocated=0", tc05_webhookMoneyOut);

  console.log(`\n────────────────────────────────────`);
  console.log(`📊 KẾT QUẢ: ${PASS} PASS / ${FAIL} FAIL`);
  if (FAIL === 0) {
    console.log("🎉 TẤT CẢ TEST CASES ĐÃ PASS!\n");
  } else {
    console.log("⚠️  CÓ TEST CASE THẤT BẠI. Xem chi tiết ở trên.\n");
  }

  await cleanup();
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("❌ Lỗi nghiêm trọng khi chạy test:", err.message);
  cleanup().finally(() => process.exit(1));
});
