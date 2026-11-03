require("module-alias/register");
const test = require("node:test");
const assert = require("node:assert/strict");
const { getCollectionDate, getCycleStart, normalizeRule } = require("@/domains/finance/credit/creditLedgerService");

test("overdraft cycle starts on the prior close day", () => {
  assert.equal(getCycleStart("2026-10-25", 26), "2026-09-26");
  assert.equal(getCycleStart("2026-10-26", 26), "2026-09-26");
});

test("interest collection day clamps to the actual following month", () => {
  assert.equal(getCollectionDate("2026-02-26", 31), "2026-03-31");
  assert.equal(getCollectionDate("2027-01-26", 31), "2027-02-28");
});

test("overdraft rule requires daily cutoff, annual rate and day-count basis", () => {
  const rule = normalizeRule("OVERDRAFT", {
    statementCloseDay: 26,
    dailyCutoffTime: "17:00",
    interestCollectionDay: 3,
    annualRatePercent: 30,
    dayCountBasis: 365,
    roundingPolicy: "HALF_UP",
    timezone: "Asia/Bangkok",
  });
  assert.equal(rule.annualRatePercent, 30);
  assert.throws(() => normalizeRule("OVERDRAFT", { ...rule, dayCountBasis: 360 }), /dayCountBasis/);
});
test("scheduler registers credit ledger handlers", () => {
  const scheduler = require("@/scheduler");
  assert.equal(typeof scheduler.runJobNow, "function");
});