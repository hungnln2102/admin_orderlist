require("module-alias/register");
process.env.NODE_ENV = "test";

const { db } = require("@/db");
const { TABLES, ORDER_COLS, PAYMENT_RECEIPT_DEF } = require("@/domains/payments/controller/shared/constants");
const { reconcilePaymentReceipt } = require("@/domains/payments/controller/handlers/reconcilePaymentReceipt");
const { processOrderPaymentPhase } = require("../webhook/sepay/routes/webhook/orderPhase");

async function testManualReconcileSplit() {
  console.log("--- Starting Manual Reconcile Split Test ---");

  // 1. Prepare test order
  const orderCode = "MAVTESTSPLITMANUAL";
  await db(TABLES.paymentReceipt).where("sepay_transaction_id", 999999999).del();
  await db(TABLES.orderList).whereRaw("LOWER(id_order) = LOWER(?)", [orderCode]).del();
  await db(TABLES.orderList).insert({
    id_order: orderCode,
    price: 640000,
    cost: 400000,
    status: "Chưa Thanh Toán",
    customer: "Test Customer",
    contact: "0900000000",
  });

  // 2. Prepare test receipt
  const [receipt] = await db(TABLES.paymentReceipt).insert({
    amount: 700000,
    payment_date: new Date(),
    receiver: "Test Receiver",
    note: `Thanh toan don ${orderCode}`,
    sender: "Test Sender",
    sepay_transaction_id: 999999999,
    reference_code: "REF12345",
    transfer_type: "in",
    gateway: "VCB",
    is_financial_posted: false,
    posted_revenue: 0,
    posted_profit: 0,
    posted_off_flow_bank_receipt: 0,
    adjustment_applied: false,
  }).returning("*");

  const receiptId = receipt.id;
  console.log(`Created test receipt #${receiptId} with amount 700,000 VND for order ${orderCode} (640,000 VND)`);

  // 3. Invoke manual reconciliation
  const req = {
    params: { receiptId },
    body: {
      orderCode: orderCode,
      action: "reconcile_and_mark_paid",
    },
  };

  let jsonResponse = null;
  const res = {
    status: function (code) {
      console.log(`[Manual Reconcile] HTTP Status: ${code}`);
      return this;
    },
    json: function (data) {
      jsonResponse = data;
      console.log(`[Manual Reconcile] Response:`, JSON.stringify(data, null, 2));
      return this;
    },
  };

  await reconcilePaymentReceipt(req, res);

  // 4. Verify results in DB
  const updatedOriginalReceipt = await db(TABLES.paymentReceipt).where("id", receiptId).first();
  console.log("Original Receipt after reconcile:", {
    id: updatedOriginalReceipt.id,
    id_order: updatedOriginalReceipt.id_order,
    amount: Number(updatedOriginalReceipt.amount),
    is_financial_posted: updatedOriginalReceipt.is_financial_posted,
    posted_revenue: Number(updatedOriginalReceipt.posted_revenue),
    posted_off_flow_bank_receipt: Number(updatedOriginalReceipt.posted_off_flow_bank_receipt),
  });

  if (Number(updatedOriginalReceipt.amount) !== 640000) {
    throw new Error(`Original receipt amount should be 640k, but got ${updatedOriginalReceipt.amount}`);
  }

  const splitReceipt = await db(TABLES.paymentReceipt)
    .whereNull("id_order")
    .where("note", "like", `%[Tách dư GD #${receiptId}]%`)
    .first();

  if (!splitReceipt) {
    throw new Error("Split receipt not found in database!");
  }

  console.log("Split Receipt found:", {
    id: splitReceipt.id,
    id_order: splitReceipt.id_order,
    amount: Number(splitReceipt.amount),
    note: splitReceipt.note,
    is_financial_posted: splitReceipt.is_financial_posted,
  });

  if (Number(splitReceipt.amount) !== 60000) {
    throw new Error(`Split receipt amount should be 60k, but got ${splitReceipt.amount}`);
  }

  // Cleanup
  await db(TABLES.paymentReceipt).where("id", receiptId).del();
  await db(TABLES.paymentReceipt).where("id", splitReceipt.id).del();
  await db(TABLES.orderList).whereRaw("LOWER(id_order) = LOWER(?)", [orderCode]).del();
  console.log("Manual reconcile test PASSED and cleaned up.");
}

async function testWebhookSplit() {
  console.log("\n--- Starting Webhook Split Test ---");

  // 1. Prepare test order
  const orderCode = "MAVTESTSPLITWEBHOOK";
  await db(TABLES.paymentReceipt).where("sepay_transaction_id", 888888888).del();
  await db(TABLES.orderList).whereRaw("LOWER(id_order) = LOWER(?)", [orderCode]).del();
  await db(TABLES.orderList).insert({
    id_order: orderCode,
    price: 640000,
    cost: 400000,
    status: "Chưa Thanh Toán",
    customer: "Test Customer Webhook",
    contact: "0900000000",
  });

  // 2. Prepare test receipt (already inserted by receiptPhase)
  const [receipt] = await db(TABLES.paymentReceipt).insert({
    id_order: orderCode,
    amount: 700000,
    payment_date: new Date(),
    receiver: "Test Receiver",
    note: `Thanh toan don ${orderCode}`,
    sender: "Test Sender",
    sepay_transaction_id: 888888888,
    reference_code: "REF88888",
    transfer_type: "in",
    gateway: "VCB",
    is_financial_posted: false,
    posted_revenue: 0,
    posted_profit: 0,
    posted_off_flow_bank_receipt: 0,
    adjustment_applied: false,
  }).returning("*");

  const receiptId = receipt.id;
  console.log(`Created test webhook receipt #${receiptId} with amount 700,000 VND matched to order ${orderCode} (640,000 VND)`);

  // 3. Mock inputs for processOrderPaymentPhase
  const stateByOrderCode = new Map();
  const eligibilityByOrderCode = new Map();
  const amountDecisionByOrderCode = new Map();

  const state = await db(TABLES.orderList).whereRaw("LOWER(id_order) = LOWER(?)", [orderCode]).first();
  stateByOrderCode.set(orderCode, state);
  eligibilityByOrderCode.set(orderCode, { eligible: false });

  const mockParsed = {
    transferAmountNormalized: 700000,
    transaction: {
      account_number: "123456",
      note: `Thanh toan don ${orderCode}`,
      sender: "Test Sender",
      reference_code: "REF88888",
      transfer_type: "in",
      gateway: "VCB",
      transaction_date: new Date(),
    },
  };

  const receiptResult = {
    inserted: true,
    paidDate: new Date(),
  };

  await db.transaction(async (trx) => {
    const pgClientMock = {
      query: async (sql, params) => {
        const knexSql = sql.replace(/\$\d+/g, "?");
        const result = await trx.raw(knexSql, params);
        return result;
      }
    };

    await processOrderPaymentPhase({
      client: pgClientMock,
      parsed: mockParsed,
      loopOrderCodes: [orderCode],
      stateByOrderCode,
      eligibilityByOrderCode,
      amountDecisionByOrderCode,
      getCurrentAmountForCode: () => 700000,
      receiptResult,
      receiptId,
      alreadyFinancialPosted: false,
      paidMonthKey: "2026-08",
    });
  });

  // 4. Verify database state
  const updatedOriginalReceipt = await db(TABLES.paymentReceipt).where("id", receiptId).first();
  console.log("Original Webhook Receipt after processOrderPaymentPhase:", {
    id: updatedOriginalReceipt.id,
    id_order: updatedOriginalReceipt.id_order,
    amount: Number(updatedOriginalReceipt.amount),
  });

  if (Number(updatedOriginalReceipt.amount) !== 640000) {
    throw new Error(`Original webhook receipt amount should be 640k, but got ${updatedOriginalReceipt.amount}`);
  }

  const splitReceipt = await db(TABLES.paymentReceipt)
    .whereNull("id_order")
    .where("note", "like", `%[Tách dư GD #${receiptId}]%`)
    .first();

  if (!splitReceipt) {
    throw new Error("Split webhook receipt not found in database!");
  }

  console.log("Split Webhook Receipt found:", {
    id: splitReceipt.id,
    id_order: splitReceipt.id_order,
    amount: Number(splitReceipt.amount),
    note: splitReceipt.note,
    is_financial_posted: splitReceipt.is_financial_posted,
  });

  if (Number(splitReceipt.amount) !== 60000) {
    throw new Error(`Split webhook receipt amount should be 60k, but got ${splitReceipt.amount}`);
  }

  // Cleanup
  await db(TABLES.paymentReceipt).where("id", receiptId).del();
  await db(TABLES.paymentReceipt).where("id", splitReceipt.id).del();
  await db(TABLES.orderList).whereRaw("LOWER(id_order) = LOWER(?)", [orderCode]).del();
  console.log("Webhook split test PASSED and cleaned up.");
}

async function run() {
  try {
    await testManualReconcileSplit();
    await testWebhookSplit();
    console.log("\nALL TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  }
}

run();
