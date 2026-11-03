const creditLedgerService = require("@/domains/finance/credit/creditLedgerService");
const { withAdvisoryLock } = require("../withAdvisoryLock");

const bangkokDate = (value = new Date()) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
}).format(value);

async function accrueCreditOverdraftInterestTask(trigger = "cron_schedule", businessDate = bangkokDate()) {
  return withAdvisoryLock(`credit_overdraft_accrual:${businessDate}`, async () => ({
    trigger,
    businessDate,
    results: await creditLedgerService.accrueOverdraftInterestForDate(businessDate),
  }));
}

async function closeCreditOverdraftStatementsTask(trigger = "cron_schedule", cycleCloseDate = bangkokDate()) {
  return withAdvisoryLock(`credit_overdraft_statement_close:${cycleCloseDate}`, async () => ({
    trigger,
    cycleCloseDate,
    results: await creditLedgerService.closeOverdraftStatements(cycleCloseDate),
  }));
}

async function evaluateCreditCardDueStatementsTask(trigger = "cron_schedule", asOf = new Date()) {
  return withAdvisoryLock(`credit_card_due_evaluation:${asOf.toISOString().slice(0, 10)}`, async () => ({
    trigger,
    results: await creditLedgerService.evaluateCreditCardDueStatements(asOf),
  }));
}

module.exports = { accrueCreditOverdraftInterestTask, closeCreditOverdraftStatementsTask, evaluateCreditCardDueStatementsTask };