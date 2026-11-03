const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("module-alias/register");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

if (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.toLowerCase().includes("test")) {
  throw new Error("Credit ledger integration test requires a dedicated test database.");
}

const { db, TABLES, COLS, withTransaction } = require("@/db");
const creditLedgerService = require("@/domains/finance/credit/creditLedgerService");

const createdAccountIds = [];
const overdraftRule = {
  statementCloseDay: 26,
  dailyCutoffTime: "17:00",
  interestCollectionDay: 3,
  annualRatePercent: 30,
  dayCountBasis: 365,
  roundingPolicy: "HALF_UP",
  timezone: "Asia/Bangkok",
};
const creditCardRule = {
  statementCloseDay: 26,
  roundingPolicy: "BANK_STATEMENT",
  timezone: "Asia/Bangkok",
};

async function createAccount(productKind, displayName, rule, openingPrincipal = 0) {
  const account = await creditLedgerService.createCreditAccount({
    productKind,
    displayName,
    rule,
    openingPrincipal,
    effectiveAt: "2026-09-25T12:00:00+07:00",
    evidenceReference: `TEST:${displayName}`,
  });
  createdAccountIds.push(Number(account.id));
  return account;
}

async function addPayment(accountId, amount, effectiveAt, idempotencyKey) {
  return withTransaction((trx) => creditLedgerService.recordPaymentInTrx(trx, accountId, {
    amount,
    effectiveAt,
    idempotencyKey,
    sourceReference: idempotencyKey,
  }));
}

test("credit ledger exports every controller operation", () => {
  assert.equal(typeof creditLedgerService.importCreditCardStatement, "function");
  assert.equal(typeof creditLedgerService.recordOverdraftInterestCollection, "function");
  assert.equal(typeof creditLedgerService.evaluateCreditCardDueStatements, "function");
});

test("overdraft accrues before cutoff, closes only on day 26, and reconciles collection on day 03", async () => {
  const account = await createAccount("OVERDRAFT", "Overdraft Integration", overdraftRule, 365000);

  const accrued = await creditLedgerService.accrueOverdraftInterestForDate("2026-10-25");
  const accrual = accrued.find((item) => item.accountId === Number(account.id));
  assert.equal(accrual.interestAmount, 300);

  const duplicateAccrual = await creditLedgerService.accrueOverdraftInterestForDate("2026-10-25");
  assert.equal(duplicateAccrual.find((item) => item.accountId === Number(account.id)).alreadyProcessed, true);

  const nonCloseDay = await creditLedgerService.closeOverdraftStatements("2026-10-25");
  assert.equal(nonCloseDay.find((item) => item.accountId === Number(account.id)).skipped, "NOT_STATEMENT_CLOSE_DAY");

  const closed = await creditLedgerService.closeOverdraftStatements("2026-10-26");
  const closeResult = closed.find((item) => item.accountId === Number(account.id));
  assert.equal(closeResult.interestDue, 300);
  const statementId = closeResult.statementId;

  const duplicateClose = await creditLedgerService.closeOverdraftStatements("2026-10-26");
  assert.equal(duplicateClose.find((item) => item.accountId === Number(account.id)).alreadyProcessed, true);

  const partial = await creditLedgerService.recordOverdraftInterestCollection(statementId, {
    amount: 100,
    effectiveAt: "2026-11-03T09:00:00+07:00",
    idempotencyKey: "overdraft-collection-partial",
    sourceReference: "OVERDRAFT-COLLECT-1",
  });
  assert.equal(partial.status, "INTEREST_COLLECTION_PARTIAL");
  assert.equal(partial.remainingInterest, 200);

  const duplicateCollection = await creditLedgerService.recordOverdraftInterestCollection(statementId, {
    amount: 100,
    effectiveAt: "2026-11-03T09:00:00+07:00",
    idempotencyKey: "overdraft-collection-partial",
    sourceReference: "OVERDRAFT-COLLECT-1",
  });
  assert.equal(duplicateCollection.alreadyProcessed, true);

  const collected = await creditLedgerService.recordOverdraftInterestCollection(statementId, {
    amount: 200,
    effectiveAt: "2026-11-03T09:01:00+07:00",
    idempotencyKey: "overdraft-collection-final",
    sourceReference: "OVERDRAFT-COLLECT-2",
  });
  assert.equal(collected.status, "INTEREST_COLLECTED");
  assert.equal(collected.remainingInterest, 0);
});

test("credit-card due evaluation distinguishes minimum payment, full payment, and past due", async () => {
  const minimumAccount = await createAccount("CREDIT_CARD", "Card Minimum Integration", creditCardRule);
  const minimumStatement = await creditLedgerService.importCreditCardStatement(minimumAccount.id, {
    cycleStartAt: "2026-10-26T00:00:00+07:00",
    cycleCloseAt: "2026-11-26T00:00:00+07:00",
    dueAt: "2026-12-10T17:00:00+07:00",
    openingPrincipal: 0,
    closingPrincipal: 850,
    interestDue: 100,
    feeDue: 50,
    minimumDue: 200,
    totalDue: 1000,
    sourceReference: "CARD-MINIMUM-STATEMENT",
  });

  const paymentResults = await Promise.all([
    addPayment(minimumAccount.id, 200, "2026-12-10T16:59:00+07:00", "card-minimum-concurrent"),
    addPayment(minimumAccount.id, 200, "2026-12-10T16:59:00+07:00", "card-minimum-concurrent"),
  ]);
  assert.equal(paymentResults.filter((result) => result.alreadyProcessed).length, 1);
  assert.equal(paymentResults.filter((result) => !result.alreadyProcessed).length, 1);

  const minimumEvaluated = await creditLedgerService.evaluateCreditCardDueStatements("2026-12-10T17:00:00+07:00");
  assert.equal(minimumEvaluated.find((item) => item.statementId === Number(minimumStatement.statement.id)).status, "MINIMUM_PAID");

  const fullAccount = await createAccount("CREDIT_CARD", "Card Full Integration", creditCardRule);
  const fullStatement = await creditLedgerService.importCreditCardStatement(fullAccount.id, {
    cycleStartAt: "2026-10-26T00:00:00+07:00",
    cycleCloseAt: "2026-11-26T00:00:00+07:00",
    dueAt: "2026-12-10T17:00:00+07:00",
    openingPrincipal: 0,
    closingPrincipal: 850,
    interestDue: 100,
    feeDue: 50,
    minimumDue: 200,
    totalDue: 1000,
    sourceReference: "CARD-FULL-STATEMENT",
  });
  await addPayment(fullAccount.id, 1000, "2026-12-10T16:59:00+07:00", "card-full-payment");

  const pastDueAccount = await createAccount("CREDIT_CARD", "Card Past Due Integration", creditCardRule);
  const pastDueStatement = await creditLedgerService.importCreditCardStatement(pastDueAccount.id, {
    cycleStartAt: "2026-10-26T00:00:00+07:00",
    cycleCloseAt: "2026-11-26T00:00:00+07:00",
    dueAt: "2026-12-10T17:00:00+07:00",
    openingPrincipal: 0,
    closingPrincipal: 850,
    interestDue: 100,
    feeDue: 50,
    minimumDue: 200,
    totalDue: 1000,
    sourceReference: "CARD-PAST-DUE-STATEMENT",
  });

  const evaluated = await creditLedgerService.evaluateCreditCardDueStatements("2026-12-10T17:00:00+07:00");
  assert.equal(evaluated.find((item) => item.statementId === Number(fullStatement.statement.id)).status, "PAID_IN_FULL");
  assert.equal(evaluated.find((item) => item.statementId === Number(pastDueStatement.statement.id)).status, "PAST_DUE");
});

test("credit-card daily partial-payment simulation counts only payments before statement due_at", async () => {
  const account = await createAccount("CREDIT_CARD", "Card Daily Payments", creditCardRule);
  const imported = await creditLedgerService.importCreditCardStatement(account.id, {
    cycleStartAt: "2026-10-26T00:00:00+07:00",
    cycleCloseAt: "2026-11-26T00:00:00+07:00",
    dueAt: "2026-12-10T17:00:00+07:00",
    openingPrincipal: 0,
    closingPrincipal: 850,
    interestDue: 100,
    feeDue: 50,
    minimumDue: 200,
    totalDue: 1000,
    sourceReference: "CARD-DAILY-PAYMENTS-STATEMENT",
  });

  await addPayment(account.id, 100, "2026-12-07T12:00:00+07:00", "card-daily-payment-1");
  await addPayment(account.id, 100, "2026-12-08T12:00:00+07:00", "card-daily-payment-2");
  await addPayment(account.id, 100, "2026-12-10T16:59:00+07:00", "card-daily-payment-3");
  await addPayment(account.id, 700, "2026-12-10T17:01:00+07:00", "card-daily-payment-after-due");

  const evaluated = await creditLedgerService.evaluateCreditCardDueStatements("2026-12-10T18:00:00+07:00");
  const result = evaluated.find((item) => item.statementId === Number(imported.statement.id));
  assert.equal(result.paidAmount, 300, "Chỉ payment trước due_at được cộng vào nghĩa vụ của statement");
  assert.equal(result.status, "MINIMUM_PAID");

  const statement = await db(TABLES.CREDIT_STATEMENTS).where(COLS.CREDIT_STATEMENTS.ID, imported.statement.id).first();
  assert.equal(statement.status, "MINIMUM_PAID");
});
test("overdraft daily partial-payment simulation uses the principal remaining at each 17:00 cutoff", async () => {
  const account = await createAccount("OVERDRAFT", "Overdraft Daily Payments", overdraftRule, 365000);

  await addPayment(account.id, 100000, "2026-10-24T16:59:00+07:00", "daily-payment-before-cutoff");
  const day24 = (await creditLedgerService.accrueOverdraftInterestForDate("2026-10-24"))
    .find((item) => item.accountId === Number(account.id));
  assert.equal(day24.interestAmount, 218, "Trả trước 17h phải giảm basis còn 265.000 VND");

  await addPayment(account.id, 100000, "2026-10-25T17:01:00+07:00", "daily-payment-after-cutoff");
  const day25 = (await creditLedgerService.accrueOverdraftInterestForDate("2026-10-25"))
    .find((item) => item.accountId === Number(account.id));
  assert.equal(day25.interestAmount, 218, "Trả sau 17h không được giảm basis lãi của ngày 25");

  await addPayment(account.id, 65000, "2026-10-26T16:59:00+07:00", "daily-payment-second-before-cutoff");
  const day26 = (await creditLedgerService.accrueOverdraftInterestForDate("2026-10-26"))
    .find((item) => item.accountId === Number(account.id));
  assert.equal(day26.interestAmount, 82, "Trả trước 17h ngày 26 phải giảm basis còn 100.000 VND");

  await addPayment(account.id, 100000, "2026-10-26T17:01:00+07:00", "daily-payment-final-after-cutoff");

  const detail = await creditLedgerService.getCreditAccountDetail(account.id);
  assert.equal(detail.balances.principal, 0, "Các payment từng phần phải tất toán toàn bộ gốc");
  assert.equal(detail.balances.interest, 518, "Tổng lãi ngày phải là 218 + 218 + 82");

  const accruals = await db(TABLES.CREDIT_INTEREST_ACCRUALS)
    .where(COLS.CREDIT_INTEREST_ACCRUALS.ACCOUNT_ID, account.id)
    .orderBy(COLS.CREDIT_INTEREST_ACCRUALS.BUSINESS_DATE, "asc");
  assert.deepEqual(accruals.map((item) => [item.business_date, Number(item.basis_amount), Number(item.interest_amount)]), [
    ["2026-10-24", 265000, 218],
    ["2026-10-25", 265000, 218],
    ["2026-10-26", 100000, 82],
  ]);
});
test.after(async () => {
  if (createdAccountIds.length) {
    const statementIds = await db(TABLES.CREDIT_STATEMENTS).whereIn(COLS.CREDIT_STATEMENTS.ACCOUNT_ID, createdAccountIds).pluck(COLS.CREDIT_STATEMENTS.ID);
    const ledgerIds = await db(TABLES.CREDIT_ACCOUNT_LEDGER).whereIn(COLS.CREDIT_ACCOUNT_LEDGER.ACCOUNT_ID, createdAccountIds).pluck(COLS.CREDIT_ACCOUNT_LEDGER.ID);
    if (ledgerIds.length) await db(TABLES.CREDIT_PAYMENT_ALLOCATIONS).whereIn(COLS.CREDIT_PAYMENT_ALLOCATIONS.PAYMENT_LEDGER_ID, ledgerIds).orWhereIn(COLS.CREDIT_PAYMENT_ALLOCATIONS.TARGET_LEDGER_ID, ledgerIds).del();
    if (statementIds.length) await db(TABLES.CREDIT_RECONCILIATION_RECORDS).whereIn(COLS.CREDIT_RECONCILIATION_RECORDS.STATEMENT_ID, statementIds).del();
    await db(TABLES.CREDIT_INTEREST_ACCRUALS).whereIn(COLS.CREDIT_INTEREST_ACCRUALS.ACCOUNT_ID, createdAccountIds).del();
    await db(TABLES.CREDIT_ACCOUNT_LEDGER).whereIn(COLS.CREDIT_ACCOUNT_LEDGER.ACCOUNT_ID, createdAccountIds).del();
    await db(TABLES.CREDIT_STATEMENTS).whereIn(COLS.CREDIT_STATEMENTS.ACCOUNT_ID, createdAccountIds).del();
    await db(TABLES.CREDIT_ACCOUNT_RULE_VERSIONS).whereIn(COLS.CREDIT_ACCOUNT_RULE_VERSIONS.ACCOUNT_ID, createdAccountIds).del();
    await db(TABLES.CREDIT_ACCOUNTS).whereIn(COLS.CREDIT_ACCOUNTS.ID, createdAccountIds).del();
  }
  await db.destroy();
});