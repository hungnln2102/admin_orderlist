#!/usr/bin/env node

process.env.NODE_ENV = process.env.NODE_ENV || "test";

const assert = require("assert/strict");
const crypto = require("crypto");
const db = require("../../src/db/knexClient");
const { STATUS } = require("../../src/utils/statuses");
const {
  ADMIN_SCHEMA,
  FINANCE_SCHEMA,
  SCHEMA_ADMIN,
  SCHEMA_FINANCE,
  tableName
} = require("../../src/config/dbSchema");

const bankAccountsTable = tableName(ADMIN_SCHEMA.SHOP_BANK_ACCOUNTS.TABLE, SCHEMA_ADMIN);
const bankLedgerTable = tableName(ADMIN_SCHEMA.SHOP_BANK_ACCOUNT_LEDGER.TABLE, SCHEMA_ADMIN);
const expensesTable = tableName(FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.TABLE, SCHEMA_FINANCE);
const dashboardSummaryTable = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);
const dashboardFinancialChangeLogTable = tableName(FINANCE_SCHEMA.DASHBOARD_FINANCIAL_CHANGE_LOG.TABLE, SCHEMA_FINANCE);

// Controllers/Handlers
const { classifyReceipt } = require("../../src/domains/payments/controller/handlers/classifyReceipt");
const { reconcilePaymentReceipt } = require("../../src/domains/payments/controller/handlers/reconcilePaymentReceipt");
const { recordShopBankAccountWithdrawal } = require("../../src/domains/shop-bank-accounts/use-cases/recordShopBankAccountWithdrawal");
const { createStoreProfitExpense } = require("../../src/domains/store-profit-expenses/controller/createStoreProfitExpense");
const { completeStoreProfitExpense } = require("../../src/domains/store-profit-expenses/controller/completeStoreProfitExpense");
const { insertPaymentReceipt } = require("../../src/domains/payments/use-cases/insertPaymentReceipt");
const { creditShopBankFromPaymentReceipt } = require("../../src/domains/shop-bank-accounts/services/shopBankLedgerService");

const TEST_PREFIX = "MAVIT";

function uniqueCode(label) {
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${TEST_PREFIX}${label}${suffix}`;
}

const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

// Helper to clone an order
async function cloneOrderFromTemplate(orderCode, price, cost = 0) {
  const template = await db("orders.order_list")
    .whereNot("id_order", "like", `${TEST_PREFIX}%`)
    .first();
  if (!template) {
    throw new Error("No template order found in db. Please seed at least one order.");
  }
  const payload = {
    ...template,
    id_order: orderCode,
    status: STATUS.UNPAID,
    price,
    gross_selling_price: price,
    cost,
    created_at: new Date(),
  };
  delete payload.id;
  await db("orders.order_list").insert(payload);
  return await db("orders.order_list").where("id_order", orderCode).first();
}

// Helper to clone a bank account
async function createTestBankAccount() {
  const template = await db(bankAccountsTable)
    .whereNot("label", "like", `${TEST_PREFIX}%`)
    .first();
  const payload = template ? { ...template } : {
    account_holder: "TEST HOLDER",
    bank_bin: "970422",
    bank_short_code: "TEST",
    bank_display_name: "Test Bank",
    qr_note_prefix: "MAV",
    is_default: false,
    is_active: true,
  };
  if (payload.id) delete payload.id;
  payload.label = `${TEST_PREFIX} Account`;
  payload.account_number = "970422TESTFINANCE";
  payload.balance = 10000000;
  payload.total_received = 0;
  payload.total_withdrawn = 0;
  payload.created_at = new Date();
  payload.updated_at = new Date();

  // Try to find if already exists
  const existing = await db(bankAccountsTable).where("account_number", "970422TESTFINANCE").first();
  if (existing) {
    await db(bankAccountsTable).where("id", existing.id).update(payload);
    return existing.id;
  }
  const [created] = await db(bankAccountsTable).insert(payload).returning("id");
  return Number(created?.id ?? created ?? 0);
}

async function cleanup() {
  console.log("Cleaning up test data...");
  // 1. Delete order list
  await db("orders.order_list").where("id_order", "like", `${TEST_PREFIX}%`).delete();
  
  // 2. Delete payment receipts and dependent tables
  const receipts = await db("receipt.payment_receipt")
    .where("reference_code", "like", `${TEST_PREFIX}%`)
    .orWhere("note", "like", `%${TEST_PREFIX}%`)
    .select("id");
  const receiptIds = receipts.map(r => r.id);
  if (receiptIds.length > 0) {
    await db("receipt.payment_receipt_financial_state").whereIn("payment_receipt_id", receiptIds).delete();
    await db("receipt.payment_receipt_financial_audit_log").whereIn("payment_receipt_id", receiptIds).delete();
    await db("receipt.payment_receipt").whereIn("id", receiptIds).delete();
  }

  // 3. Delete store_profit_expenses
  await db(expensesTable).where("reason", "like", `%${TEST_PREFIX}%`).delete();

  // 4. Delete shop bank account ledger
  const testAcc = await db(bankAccountsTable).where("account_number", "970422TESTFINANCE").first();
  if (testAcc) {
    await db(bankLedgerTable).where("shop_bank_account_id", testAcc.id).delete();
    await db(bankAccountsTable).where("id", testAcc.id).delete();
  }
}

async function runTests() {
  await cleanup();
  const bankAccId = await createTestBankAccount();
  console.log(`Created test bank account with ID: ${bankAccId}`);

  // Fetch current month key (YYYY-MM)
  const currentMonthKey = new Date().toISOString().slice(0, 7);

  // Capture initial monthly summary
  const initialSummary = await db(dashboardSummaryTable)
    .where("month_key", currentMonthKey)
    .first();
  const initialRev = Number(initialSummary?.total_revenue || 0);
  const initialProf = Number(initialSummary?.total_profit || 0);
  const initialBankBal = Number(initialSummary?.estimated_bank_balance || 0);
  const initialOffFlow = Number(initialSummary?.total_off_flow_bank_receipt || 0);

  try {
    // ----------------------------------------------------
    // TEST CASE 1: Receipt Flow & Reconcile (Biên lai)
    // ----------------------------------------------------
    console.log("\n--- TEST CASE 1: Reconcile Receipt to Order ---");
    const orderCode = uniqueCode("ORD");
    await cloneOrderFromTemplate(orderCode, 150000, 50000);
    console.log(`Created test order: ${orderCode}`);

    const txnId = String(Math.floor(1000000000 + Math.random() * 9000000000));
    const refCode = uniqueCode("REF");
    const receiptResult = await insertPaymentReceipt({
      transaction_id: txnId,
      reference_code: refCode,
      transfer_amount: 150000,
      account_number: "970422TESTFINANCE",
      transfer_type: "in",
      gateway: "manual",
      transaction_content: `Chuyen khoan ${orderCode}`,
    });
    const receiptId = receiptResult.id;
    console.log(`Inserted payment receipt ID: ${receiptId}`);

    // Credit bank account to simulate money arriving at bank via webhook
    await creditShopBankFromPaymentReceipt(db, {
      receiptId,
      receiverAccount: "970422TESTFINANCE",
      amount: 150000,
      note: `Chuyen khoan ${orderCode}`,
    });
    console.log(`Credited bank account for receipt ID: ${receiptId}`);

    // Call Reconcile
    const recReq = {
      params: { receiptId },
      body: { orderCode, action: "reconcile_and_mark_paid" }
    };
    const recRes = mockRes();
    await reconcilePaymentReceipt(recReq, recRes);
    assert.equal(recRes.body?.success, true, "Reconcile should succeed");

    // Assert DB State
    const updatedOrder = await db("orders.order_list").where("id_order", orderCode).first();
    assert.equal(updatedOrder.status, STATUS.PAID, "Order status should be PAID");

    const updatedBank = await db(bankAccountsTable).where("id", bankAccId).first();
    assert.equal(Number(updatedBank.balance), 10150000, "Bank balance should increase by 150000");
    assert.equal(Number(updatedBank.total_received), 150000, "Bank total_received should be 150000");

    const ledgerCount = await db(bankLedgerTable)
      .where("shop_bank_account_id", bankAccId)
      .count({ count: "*" })
      .first();
    assert.equal(Number(ledgerCount.count), 1, "There should be exactly 1 ledger record");
    const ledgerEntry = await db(bankLedgerTable)
      .where("shop_bank_account_id", bankAccId)
      .first();
    assert.equal(Number(ledgerEntry.signed_amount), 150000, "Ledger signed_amount should be 150000");

    // Wait a brief moment to allow subscriber events to run (since events are async)
    await new Promise(r => setTimeout(r, 500));

    const summaryAfterRec = await db(dashboardSummaryTable)
      .where("month_key", currentMonthKey)
      .first();
    assert.equal(Number(summaryAfterRec.total_revenue) - initialRev, 150000, "Dashboard total_revenue delta should be 150000");
    assert.equal(Number(summaryAfterRec.total_profit) - initialProf, 100000, "Dashboard total_profit delta should be 100000 (150K price - 50K cost)");
    assert.equal(Number(summaryAfterRec.estimated_bank_balance) - initialBankBal, 150000, "Dashboard estimated_bank_balance delta should be 150000");

    console.log("✅ Test Case 1 Passed!");

    // ----------------------------------------------------
    // TEST CASE 2: Classification (Phân loại ngoài luồng)
    // ----------------------------------------------------
    console.log("\n--- TEST CASE 2: Classify Off-flow Revenue ---");
    const txnIdOffFlow = String(Math.floor(1000000000 + Math.random() * 9000000000));
    const refCodeOffFlow = uniqueCode("REF");
    const offFlowReceiptResult = await insertPaymentReceipt({
      transaction_id: txnIdOffFlow,
      reference_code: refCodeOffFlow,
      transfer_amount: 80000,
      account_number: "970422TESTFINANCE",
      transfer_type: "in",
      gateway: "manual",
      transaction_content: "Tien ngoai luong MAVIT",
    });
    const offFlowReceiptId = offFlowReceiptResult.id;
    console.log(`Inserted off-flow receipt ID: ${offFlowReceiptId}`);

    // Credit bank account to simulate money arriving at bank via webhook
    await creditShopBankFromPaymentReceipt(db, {
      receiptId: offFlowReceiptId,
      receiverAccount: "970422TESTFINANCE",
      amount: 80000,
      note: "Tien ngoai luong MAVIT",
    });
    console.log(`Credited bank account for off-flow receipt ID: ${offFlowReceiptId}`);

    // Find receipt flow type for off_flow_revenue
    const flowType = await db("receipt.receipt_flow_types").where("code", "off_flow_revenue").first();
    assert.ok(flowType, "Should have off_flow_revenue flow type");

    // Classify receipt
    const classReq = {
      params: { receiptId: offFlowReceiptId },
      body: { flowTypeId: flowType.id, note: `${TEST_PREFIX} classify note` }
    };
    const classRes = mockRes();
    await classifyReceipt(classReq, classRes);
    assert.equal(classRes.body?.success, true, "Classify should succeed");

    // Assert state in DB
    const receiptState = await db("receipt.payment_receipt_financial_state")
      .where("payment_receipt_id", offFlowReceiptId)
      .first();
    assert.equal(receiptState.is_financial_posted, true, "is_financial_posted should be true");
    assert.equal(Number(receiptState.posted_off_flow_bank_receipt), 80000, "posted_off_flow_bank_receipt should be 80000");

    // Wait for event updates if any
    await new Promise(r => setTimeout(r, 500));

    const summaryAfterClass = await db(dashboardSummaryTable)
      .where("month_key", currentMonthKey)
      .first();
    assert.equal(Number(summaryAfterClass.total_off_flow_bank_receipt) - initialOffFlow, 80000, "Dashboard total_off_flow_bank_receipt delta should be 80000");
    console.log("✅ Test Case 2 Passed!");

    // ----------------------------------------------------
    // TEST CASE 3: Withdrawal (Rút tiền) - Completed
    // ----------------------------------------------------
    console.log("\n--- TEST CASE 3: Withdrawal - Completed ---");
    const balBeforeWithdraw = (await db(bankAccountsTable).where("id", bankAccId).first()).balance;
    const summaryBeforeWithdraw = await db(dashboardSummaryTable).where("month_key", currentMonthKey).first();

    const withdrawResult = await recordShopBankAccountWithdrawal(bankAccId, {
      amount: 40000,
      reason: `${TEST_PREFIX} Completed Withdraw`,
      status: "completed"
    });
    assert.equal(Number(withdrawResult.withdrawnAmount), 40000, "Withdraw payload returned should show correct amount");

    // Assert bank balance
    const bankAfterWithdraw = await db(bankAccountsTable).where("id", bankAccId).first();
    assert.equal(Number(bankAfterWithdraw.balance), Number(balBeforeWithdraw) - 40000, "Bank balance should decrease by 40000");

    // Assert ledger
    const latestLedger = await db(bankLedgerTable)
      .where("shop_bank_account_id", bankAccId)
      .orderBy("id", "desc")
      .first();
    assert.equal(Number(latestLedger.signed_amount), -40000, "Ledger signed_amount should be -40000");

    // Assert dashboard
    const summaryAfterWithdraw = await db(dashboardSummaryTable).where("month_key", currentMonthKey).first();
    assert.equal(
      Number(summaryAfterWithdraw.estimated_bank_balance),
      Number(summaryBeforeWithdraw.estimated_bank_balance) - 40000,
      "estimated_bank_balance should decrease by 40000"
    );
    console.log("✅ Test Case 3 Passed!");

    // ----------------------------------------------------
    // TEST CASE 4: Withdrawal (Rút tiền) - Pending -> Completed
    // ----------------------------------------------------
    console.log("\n--- TEST CASE 4: Withdrawal - Pending -> Completed ---");
    const balBeforePending = (await db(bankAccountsTable).where("id", bankAccId).first()).balance;
    const summaryBeforePending = await db(dashboardSummaryTable).where("month_key", currentMonthKey).first();

    const pendingWithdraw = await recordShopBankAccountWithdrawal(bankAccId, {
      amount: 25000,
      reason: `${TEST_PREFIX} Pending Withdraw`,
      status: "pending"
    });

    // Assert bank balance NOT changed
    const bankAfterPending = await db(bankAccountsTable).where("id", bankAccId).first();
    assert.equal(Number(bankAfterPending.balance), Number(balBeforePending), "Bank balance should not change for pending withdraw");

    // Get expense ID
    const expense = await db(expensesTable)
      .where("reason", `${TEST_PREFIX} Pending Withdraw`)
      .first();
    assert.ok(expense, "Expense should be inserted");
    assert.equal(expense.status, "pending", "Expense status should be pending");

    // Complete it
    const compReq = { params: { id: expense.id } };
    const compRes = mockRes();
    await completeStoreProfitExpense(compReq, compRes);
    assert.equal(compRes.body?.success, true, "Complete expense should succeed");

    // Assert bank balance changed now
    const bankAfterComplete = await db(bankAccountsTable).where("id", bankAccId).first();
    assert.equal(Number(bankAfterComplete.balance), Number(balBeforePending) - 25000, "Bank balance should decrease by 25000 after complete");

    // Assert dashboard
    const summaryAfterComplete = await db(dashboardSummaryTable).where("month_key", currentMonthKey).first();
    assert.equal(
      Number(summaryAfterComplete.estimated_bank_balance),
      Number(summaryBeforePending.estimated_bank_balance) - 25000,
      "estimated_bank_balance should decrease by 25000 after complete"
    );
    console.log("✅ Test Case 4 Passed!");

    // ----------------------------------------------------
    // TEST CASE 5: Off-flow Import (Nhập hóa đơn ngoài luồng) - Completed
    // ----------------------------------------------------
    console.log("\n--- TEST CASE 5: External Import - Completed ---");
    const balBeforeImport = (await db(bankAccountsTable).where("id", bankAccId).first()).balance;
    const summaryBeforeImport = await db(dashboardSummaryTable).where("month_key", currentMonthKey).first();

    const importReq = {
      body: {
        amount: 35000,
        reason: `${TEST_PREFIX} Completed Import`,
        expense_type: "external_import",
        shop_bank_account_id: bankAccId,
        status: "completed"
      }
    };
    const importRes = mockRes();
    await createStoreProfitExpense(importReq, importRes);
    assert.equal(importRes.statusCode, 201, "Create store profit expense should return 201");

    // Assert bank balance
    const bankAfterImport = await db(bankAccountsTable).where("id", bankAccId).first();
    assert.equal(Number(bankAfterImport.balance), Number(balBeforeImport) - 35000, "Bank balance should decrease by 35000");

    // Assert dashboard
    const summaryAfterImport = await db(dashboardSummaryTable).where("month_key", currentMonthKey).first();
    assert.equal(
      Number(summaryAfterImport.total_profit),
      Number(summaryBeforeImport.total_profit) - 35000,
      "total_profit should decrease by 35000"
    );
    assert.equal(
      Number(summaryAfterImport.estimated_bank_balance),
      Number(summaryBeforeImport.estimated_bank_balance) - 35000,
      "estimated_bank_balance should decrease by 35000"
    );
    console.log("✅ Test Case 5 Passed!");

    // ----------------------------------------------------
    // TEST CASE 6: External Import - Pending -> Completed
    // ----------------------------------------------------
    console.log("\n--- TEST CASE 6: External Import - Pending -> Completed ---");
    const balBeforeImportPending = (await db(bankAccountsTable).where("id", bankAccId).first()).balance;
    const summaryBeforeImportPending = await db(dashboardSummaryTable).where("month_key", currentMonthKey).first();

    const importPendingReq = {
      body: {
        amount: 45000,
        reason: `${TEST_PREFIX} Pending Import`,
        expense_type: "external_import",
        shop_bank_account_id: bankAccId,
        status: "pending"
      }
    };
    const importPendingRes = mockRes();
    await createStoreProfitExpense(importPendingReq, importPendingRes);
    assert.equal(importPendingRes.statusCode, 201, "Create pending store profit expense should return 201");

    // Assert bank balance NOT changed
    const bankAfterImportPending = await db(bankAccountsTable).where("id", bankAccId).first();
    assert.equal(Number(bankAfterImportPending.balance), Number(balBeforeImportPending), "Bank balance should not change for pending import");

    // Get expense ID
    const impExpense = await db(expensesTable)
      .where("reason", `${TEST_PREFIX} Pending Import`)
      .first();
    assert.ok(impExpense, "Import expense should be inserted");

    // Complete it
    const impCompReq = { params: { id: impExpense.id } };
    const impCompRes = mockRes();
    await completeStoreProfitExpense(impCompReq, impCompRes);
    assert.equal(impCompRes.body?.success, true, "Complete import expense should succeed");

    // Assert bank balance and dashboard changed now
    const bankAfterImportComplete = await db(bankAccountsTable).where("id", bankAccId).first();
    assert.equal(Number(bankAfterImportComplete.balance), Number(balBeforeImportPending) - 45000, "Bank balance should decrease by 45000 after complete");

    const summaryAfterImportComplete = await db(dashboardSummaryTable).where("month_key", currentMonthKey).first();
    assert.equal(
      Number(summaryAfterImportComplete.total_profit),
      Number(summaryBeforeImportPending.total_profit) - 45000,
      "total_profit should decrease by 45000 after complete"
    );
    assert.equal(
      Number(summaryAfterImportComplete.estimated_bank_balance),
      Number(summaryBeforeImportPending.estimated_bank_balance) - 45000,
      "estimated_bank_balance should decrease by 45000 after complete"
    );
    console.log("✅ Test Case 6 Passed!");

  } finally {
    // Restore dashboard monthly summary to initial values
    if (initialSummary) {
      await db(dashboardSummaryTable)
        .where("month_key", currentMonthKey)
        .update(initialSummary);
    } else {
      await db(dashboardSummaryTable)
        .where("month_key", currentMonthKey)
        .delete();
    }
    // Delete any financial change logs created during the test
    await db(dashboardFinancialChangeLogTable)
      .where("month_key", currentMonthKey)
      .where("context", "like", `%${TEST_PREFIX}%`)
      .delete();

    await cleanup();
    await db.destroy();
    console.log("\nAll cleanup completed successfully.");
  }
}

runTests().then(() => {
  console.log("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉");
  process.exit(0);
}).catch(err => {
  console.error("\n❌ TEST RUN FAILED:", err);
  process.exit(1);
});
