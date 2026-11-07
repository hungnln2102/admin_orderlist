const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
require("module-alias/register");
if (!process.env.TEST_DATABASE_URL || process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.includes("receipt_profit_test")) {
  throw new Error("Requires isolated receipt_profit_test database via tests/run-integration.js");
}
const { db, TABLES } = require("@/db");
const { processPaymentWebhook } = require("@/domains/payments/services/webhookPaymentService");
const { SUPPLIER_PAYMENT_STATUS } = require("@/constants/supplierStatus");
const { allocateReceipt } = require("@/domains/invoices/services/invoiceService");
const finance = require("@/domains/finance/services/financeHubService");
const { getDashboardSummary } = require("@/domains/dashboard/services/dashboardService");
const expenseService = require("@/domains/finance/services/storeProfitExpenseService");
const { getVietnamDateString } = require("@/utils/time");
const { financeNotifier } = require("@/domains/notifications/telegram");
financeNotifier.notifyFinanceMonthlyDelta = async () => {};
const date = getVietnamDateString();
const month = date.slice(0, 7);
let shop;
let personal;
let transactionId = Date.now();

beforeEach(async () => {
  const tables = [TABLES.PAYMENT_RECEIPT, TABLES.PAYMENT_RECEIPT_ALLOCATIONS, TABLES.STORE_PROFIT_EXPENSES,
    TABLES.PROFIT_OBLIGATION_SNAPSHOTS, TABLES.DEBT_PAYMENT_LOGS, TABLES.FINANCIAL_ACCOUNTS,
    TABLES.FIXED_COSTS, TABLES.INSTALLMENTS, TABLES.PERSONAL_ASSETS, TABLES.SUPPLIER,
    TABLES.SUPPLIER_ORDER_COST_LOG, TABLES.DAILY_REVENUE_SUMMARY];
  await db.raw("TRUNCATE " + tables.map(() => "??").join(",") + " RESTART IDENTITY CASCADE", tables);
  [shop] = await db(TABLES.FINANCIAL_ACCOUNTS).insert({ account_number: "990001", account_scope: "SHOP", account_type: "bank", bank_short_code: "MB", balance: 10000000, is_active: true, is_deleted: false, is_default: true }).returning("*");
  [personal] = await db(TABLES.FINANCIAL_ACCOUNTS).insert({ account_number: "990002", account_scope: "PERSONAL", account_type: "bank", bank_short_code: "MB", balance: 10000000, is_active: true, is_deleted: false }).returning("*");
});
after(async () => db.destroy());

function payload(amount, extra = {}) {
  return { id: ++transactionId, accountNumber: shop.account_number, gateway: "MBBank", transferType: "out", transferAmount: amount, transactionDate: date, content: "receipt profit test", ...extra };
}
async function outgoing(amount, extra) { return processPaymentWebhook(payload(amount, extra)); }
async function expenseTotal(receiptId) {
  const row = await db(TABLES.STORE_PROFIT_EXPENSES).where({ payment_receipt_id: receiptId, status: "completed" }).sum({ total: "amount" }).first();
  return Number(row.total || 0);
}
async function fixed(amount = 1000000) {
  const [row] = await db(TABLES.FIXED_COSTS).insert({ name: "Fixed test", amount, is_active: true }).returning("*");
  return row;
}
async function debt(amount = 2000000) {
  const [row] = await db(TABLES.PERSONAL_ASSETS).insert({ name: "Debt test", type: "DEBT_PAYABLE", amount, debt_interest_enabled: false }).returning("*");
  return row;
}
async function summary() { return (await finance.getFinanceSummary(month)).breakEven; }

test("unlisted shop OUT immediately reduces profit, including zero revenue and negative bank balance", async () => {
  const result = await outgoing(11000000);
  const receipt = await db(TABLES.PAYMENT_RECEIPT).where("id", result.receiptId).first();
  assert.equal(receipt.status, "UNALLOCATED");
  assert.equal(Number(receipt.financial_account_id), Number(shop.id));
  assert.equal(await expenseTotal(receipt.id), 11000000);
  assert.equal(Number((await db(TABLES.FINANCIAL_ACCOUNTS).where("id", shop.id).first()).balance), -1000000);
  assert.equal((await summary()).netProfit, -11000000);
  const dashboard = await getDashboardSummary({ period: "month", month, year: Number(month.slice(0, 4)) });
  assert.equal(dashboard.summary.totalProfit, -11000000);
});

test("food and external import classification preserve one deduction across partial allocations", async () => {
  const result = await outgoing(1000000);
  await allocateReceipt(result.receiptId, { allocation_type: "OPERATIONAL_EXPENSE", amount: 400000, note: "food" });
  assert.equal(await expenseTotal(result.receiptId), 1000000);
  await allocateReceipt(result.receiptId, { allocation_type: "EXTERNAL_IMPORT", amount: 600000, note: "import" });
  assert.equal(await expenseTotal(result.receiptId), 1000000);
  assert.equal((await summary()).netProfit, -1000000);
});

test("unknown category remains deducted rather than becoming log-only", async () => {
  const result = await outgoing(500000);
  await allocateReceipt(result.receiptId, { allocation_type: "OTHER", amount: 500000 });
  assert.equal(await expenseTotal(result.receiptId), 500000);
});

test("fixed cost allocation reverses provisional expense, not the monthly obligation", async () => {
  const obligation = await fixed();
  assert.equal((await summary()).netProfit, -1000000);
  const result = await outgoing(1000000);
  assert.equal((await summary()).netProfit, -2000000);
  await allocateReceipt(result.receiptId, { allocation_type: "FIXED_COST", target_code: "FIXED_COST_" + obligation.id, amount: 1000000 });
  assert.equal(await expenseTotal(result.receiptId), 0);
  assert.equal((await summary()).netProfit, -1000000);
});

test("finance fixed payment uses the same coverage and cannot invent bank refund", async () => {
  const obligation = await fixed();
  const result = await outgoing(1000000);
  await finance.payFixedCost(obligation.id, { receiptId: result.receiptId, periodMonth: month, amount: 1000000 });
  assert.equal(await expenseTotal(result.receiptId), 0);
  await assert.rejects(finance.cancelFixedCostPayment(obligation.id, { periodMonth: month }), /Receipt-backed/);
});

test("debt partial payments retain month budget and deduct only amount above it", async () => {
  const obligation = await debt();
  assert.equal((await summary()).personalDebtMonthlyTotal, 100000);
  const first = await outgoing(60000);
  await allocateReceipt(first.receiptId, { allocation_type: "PERSONAL_DEBT", target_code: "PERSONAL_DEBT_" + obligation.id, amount: 60000 });
  assert.equal(await expenseTotal(first.receiptId), 0);
  const second = await outgoing(60000);
  await allocateReceipt(second.receiptId, { allocation_type: "PERSONAL_DEBT", target_code: "PERSONAL_DEBT_" + obligation.id, amount: 60000 });
  assert.equal(await expenseTotal(second.receiptId), 20000);
  assert.equal((await summary()).netProfit, -120000);
});

test("finance debt payment preserves monthly burden after reducing principal", async () => {
  const obligation = await debt();
  const result = await outgoing(100000);
  await finance.payPersonalAsset(obligation.id, { receiptId: result.receiptId, amount: 100000 });
  assert.equal(await expenseTotal(result.receiptId), 0);
  assert.equal((await summary()).personalDebtMonthlyTotal, 100000);
});

test("installments allocated from finance do not deduct twice", async () => {
  const [obligation] = await db(TABLES.INSTALLMENTS).insert({ name: "Installment test", monthly_amount: 200000, total_periods: 12, start_period: month, is_active: true, status: "ACTIVE" }).returning("*");
  const result = await outgoing(200000);
  await finance.payInstallment(obligation.id, { receiptId: result.receiptId, amount: 200000, periodMonth: month });
  assert.equal(await expenseTotal(result.receiptId), 0);
  assert.equal((await summary()).netProfit, -200000);
});

test("concurrent webhook retries debit and record profit only once", async () => {
  const data = payload(123456);
  const results = await Promise.all([processPaymentWebhook(data), processPaymentWebhook(data)]);
  assert.equal(String(results[0].receiptId), String(results[1].receiptId));
  assert.equal(await expenseTotal(results[0].receiptId), 123456);
  assert.equal(Number((await db(TABLES.FINANCIAL_ACCOUNTS).where("id", shop.id).first()).balance), 9876544);
});

test("concurrent allocations cannot spend the same receipt twice", async () => {
  const result = await outgoing(100000);
  const outcomes = await Promise.allSettled([1, 2].map(() => allocateReceipt(result.receiptId, { allocation_type: "EXPENSE", amount: 100000 })));
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  assert.equal(await expenseTotal(result.receiptId), 100000);
});

test("PERSONAL and unknown accounts never charge shop profit or fallback to default", async () => {
  const personalReceipt = await outgoing(100000, { accountNumber: personal.account_number });
  await allocateReceipt(personalReceipt.receiptId, { allocation_type: "EXPENSE", amount: 100000 });
  assert.equal(await expenseTotal(personalReceipt.receiptId), 0);
  for (const accountNumber of ["unknown", ""]) {
    const result = await outgoing(200000, { accountNumber });
    assert.equal(result.reason, "ACCOUNT_NOT_RESOLVED");
    assert.equal(await expenseTotal(result.receiptId), 0);
  }
  assert.equal(Number((await db(TABLES.FINANCIAL_ACCOUNTS).where("id", shop.id).first()).balance), 10000000);
});

test("invalid target rolls back allocation and provisional expense atomically", async () => {
  const result = await outgoing(100000);
  await assert.rejects(allocateReceipt(result.receiptId, { allocation_type: "FIXED_COST", target_code: "FIXED_COST_999999", amount: 100000 }));
  assert.equal(Number((await db(TABLES.PAYMENT_RECEIPT).where("id", result.receiptId).first()).unallocated_amount), 100000);
  assert.equal(await expenseTotal(result.receiptId), 100000);
});

test("managed expense cannot be edited or deleted to refund bank cash", async () => {
  const result = await outgoing(100000);
  const expense = await db(TABLES.STORE_PROFIT_EXPENSES).where("payment_receipt_id", result.receiptId).first();
  await assert.rejects(expenseService.updateExpense(expense.id, { amount: 1 }), /Receipt-backed/);
  await assert.rejects(expenseService.deleteExpense(expense.id), /Receipt-backed/);
  assert.equal(await expenseTotal(result.receiptId), 100000);
});

test("manual import is not counted again in daily COGS", async () => {
  await expenseService.createExpense({ amount: 200000, expense_type: "external_import", shop_bank_account_id: shop.id, expense_date: date });
  assert.equal((await summary()).netProfit, -200000);
  assert.equal((await summary()).shopCogs, 0);
});


test("supplier settlement remains excluded from profit expenses", async () => {
  const [supplier] = await db(TABLES.SUPPLIER).insert({ supplier_name: "Supplier test", number_bank: "1234" }).returning("*");
  await db(TABLES.SUPPLIER_ORDER_COST_LOG).insert({ supply_id: supplier.id, import_cost: 700000 + Number(supplier.id), ncc_payment_status: SUPPLIER_PAYMENT_STATUS.UNPAID });
  const result = await outgoing(700000);
  assert.equal(result.matched, true);
  assert.equal(await expenseTotal(result.receiptId), 0);
  assert.equal((await summary()).netProfit, 0);
});

test("mixed fixed cost and food only add food to the original monthly burden", async () => {
  const obligation = await fixed(300000);
  const result = await outgoing(500000);
  await allocateReceipt(result.receiptId, { allocation_type: "FIXED_COST", target_code: "FIXED_COST_" + obligation.id, amount: 300000 });
  await allocateReceipt(result.receiptId, { allocation_type: "OPERATIONAL_EXPENSE", amount: 200000 });
  assert.equal(await expenseTotal(result.receiptId), 200000);
  assert.equal((await summary()).netProfit, -500000);
});

test("inactive obligation does not erase actual spending", async () => {
  const obligation = await fixed(300000);
  await db(TABLES.FIXED_COSTS).where("id", obligation.id).update({ is_active: false });
  const result = await outgoing(300000);
  await allocateReceipt(result.receiptId, { allocation_type: "FIXED_COST", target_code: "FIXED_COST_" + obligation.id, amount: 300000 });
  assert.equal(await expenseTotal(result.receiptId), 300000);
  assert.equal((await summary()).netProfit, -300000);
});

test("cross-month obligation allocation is rejected without changing expense", async () => {
  const obligation = await fixed();
  const result = await outgoing(1000000);
  const otherMonth = month.endsWith("12") ? month.slice(0, 4) + "-11" : month.slice(0, 4) + "-12";
  await assert.rejects(finance.payFixedCost(obligation.id, { receiptId: result.receiptId, periodMonth: otherMonth, amount: 1000000 }), /same month/);
  assert.equal(await expenseTotal(result.receiptId), 1000000);
});

test("invalid gateway and ambiguous account do not debit a guessed account", async () => {
  const wrongBank = await outgoing(100000, { gateway: "Vietcombank" });
  assert.equal(wrongBank.reason, "ACCOUNT_NOT_RESOLVED");
  await db(TABLES.FINANCIAL_ACCOUNTS).insert({ account_number: shop.account_number, account_scope: "PERSONAL", account_type: "bank", bank_short_code: "MB", balance: 1000000, is_deleted: false });
  const ambiguous = await outgoing(100000);
  assert.equal(ambiguous.reason, "ACCOUNT_NOT_RESOLVED");
  assert.equal((await summary()).netProfit, 0);
});

test("ledger failure rolls back receipt, bank debit and expense", async () => {
  await db.raw("ALTER TABLE ?? ADD CONSTRAINT receipt_profit_test_reject CHECK (amount <> 424242)", [TABLES.FINANCIAL_ACCOUNT_LEDGER]);
  try {
    await assert.rejects(outgoing(424242), /receipt_profit_test_reject/);
    assert.equal(Number((await db(TABLES.PAYMENT_RECEIPT).count("id as count").first()).count), 0);
    assert.equal(Number((await db(TABLES.FINANCIAL_ACCOUNTS).where("id", shop.id).first()).balance), 10000000);
    assert.equal((await summary()).netProfit, 0);
  } finally {
    await db.raw("ALTER TABLE ?? DROP CONSTRAINT receipt_profit_test_reject", [TABLES.FINANCIAL_ACCOUNT_LEDGER]);
  }
});

test("concurrent debt allocations share the same monthly allowance", async () => {
  const obligation = await debt();
  const first = await outgoing(80000);
  const second = await outgoing(80000);
  await Promise.all([first, second].map((receipt) => allocateReceipt(receipt.receiptId, { allocation_type: "PERSONAL_DEBT", target_code: "PERSONAL_DEBT_" + obligation.id, amount: 80000 })));
  assert.equal((await expenseTotal(first.receiptId)) + (await expenseTotal(second.receiptId)), 60000);
  assert.equal((await summary()).netProfit, -160000);
});

test("direct personal-account expenses do not reduce shop profit", async () => {
  await expenseService.createExpense({ amount: 200000, expense_type: "monthly_expense", shop_bank_account_id: personal.id, expense_date: date });
  assert.equal((await summary()).netProfit, 0);
});

test("future installment is not an already-counted obligation", async () => {
  const [obligation] = await db(TABLES.INSTALLMENTS).insert({ name: "Future installment", monthly_amount: 200000, total_periods: 12, start_period: String(Number(month.slice(0, 4)) + 1) + "-01", is_active: true, status: "ACTIVE" }).returning("*");
  const result = await outgoing(200000);
  await allocateReceipt(result.receiptId, { allocation_type: "INSTALLMENT", target_code: "INSTALLMENT_" + obligation.id, amount: 200000 });
  assert.equal(await expenseTotal(result.receiptId), 200000);
  assert.equal((await summary()).netProfit, -200000);
});

test("prior bank debt repayment consumes the monthly allowance", async () => {
  const obligation = await debt();
  await finance.payPersonalAsset(obligation.id, { financialAccountId: shop.id, amount: 100000 });
  const result = await outgoing(100000);
  await allocateReceipt(result.receiptId, { allocation_type: "PERSONAL_DEBT", target_code: "PERSONAL_DEBT_" + obligation.id, amount: 100000 });
  assert.equal(await expenseTotal(result.receiptId), 100000);
  assert.equal((await summary()).netProfit, -200000);
});

test("classification after month boundary preserves the bank transaction month", async () => {
  const previousDate = new Date(date + "T00:00:00Z");
  previousDate.setUTCDate(0);
  const previousDay = previousDate.toISOString().slice(0, 10);
  const result = await outgoing(200000, { transactionDate: previousDay });
  await allocateReceipt(result.receiptId, { allocation_type: "OPERATIONAL_EXPENSE", amount: 200000 });
  const expenses = await db(TABLES.STORE_PROFIT_EXPENSES).where("payment_receipt_id", result.receiptId);
  assert.ok(expenses.every((row) => row.expense_date === previousDay));
  assert.equal((await finance.getFinanceSummary(previousDay.slice(0, 7))).breakEven.netProfit, -200000);
  assert.equal((await summary()).netProfit, 0);
});

test("remaining profit stays positive until actual spending exhausts it", async () => {
  await db(TABLES.DAILY_REVENUE_SUMMARY).insert({ summary_date: date, earned_revenue: 10000000, total_shop_cost: 0, revenue_reversed: 0 });
  const obligation = await fixed(3000000);
  const food = await outgoing(500000);
  await allocateReceipt(food.receiptId, { allocation_type: "OPERATIONAL_EXPENSE", amount: 500000 });
  assert.equal((await summary()).netProfit, 6500000);
  const paid = await outgoing(1000000);
  await allocateReceipt(paid.receiptId, { allocation_type: "FIXED_COST", target_code: "FIXED_COST_" + obligation.id, amount: 1000000 });
  assert.equal((await summary()).netProfit, 6500000);
  await outgoing(7000000);
  assert.equal((await summary()).netProfit, -500000);
});

test("migration roundtrip on empty accounting state is transactional", async () => {
  const migration = require("../../src/db/migrations/20261107000002_receipt_shop_profit");
  await assert.rejects(db.transaction(async (trx) => {
    await migration.down(trx);
    await migration.up(trx);
    throw new Error("ROLLBACK_MIGRATION_TEST");
  }), /ROLLBACK_MIGRATION_TEST/);
});

test("migration rollback refuses to discard existing accounting state", async () => {
  await outgoing(100000);
  const migration = require("../../src/db/migrations/20261107000002_receipt_shop_profit");
  await assert.rejects(db.transaction((trx) => migration.down(trx)), /Cannot roll back/);
  assert.equal((await summary()).netProfit, -100000);
});

test("dashboard daily and yearly charts include shop spending, excluding personal spending", async () => {
  await outgoing(200000);
  await expenseService.createExpense({ amount: 100000, expense_type: "monthly_expense", shop_bank_account_id: personal.id, expense_date: date });
  const monthly = await getDashboardSummary({ period: "month", month });
  assert.equal(monthly.chartData.reduce((total, point) => total + point.profit, 0), -200000);
  const yearly = await getDashboardSummary({ period: "year", year: Number(month.slice(0, 4)) });
  assert.equal(yearly.chartData.reduce((total, point) => total + point.profit, 0), -200000);
});
