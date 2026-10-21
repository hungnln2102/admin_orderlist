const test = require("node:test");
const assert = require("node:assert/strict");
require("module-alias/register");

const {
  calculateProfitAmount,
  getProfitPeriod,
  getVietnamTimeString,
  isCreditTimeReached,
} = require("@/scheduler/tasks/creditSavingsProfitTask");

const vietnamSevenAm = new Date("2026-10-21T00:00:00.000Z");

test("xác định giờ cộng lãi theo múi giờ Việt Nam", () => {
  assert.equal(getVietnamTimeString(vietnamSevenAm), "07:00");
});

test("mỗi chu kỳ dùng một khóa idempotency riêng", () => {
  assert.equal(getProfitPeriod("DAILY", vietnamSevenAm), "2026-10-21");
  assert.equal(getProfitPeriod("MONTHLY", vietnamSevenAm), "2026-10");
  assert.equal(getProfitPeriod("YEARLY", vietnamSevenAm), "2026");
});

test("cộng bù khi đã qua giờ ghi nhận, chưa cộng khi chưa đến giờ", () => {
  assert.equal(isCreditTimeReached("07:00", "07:00"), true);
  assert.equal(isCreditTimeReached("07:00", "09:15"), true);
  assert.equal(isCreditTimeReached("07:00", "06:59"), false);
  assert.equal(isCreditTimeReached("7:00", "10:00"), true);
  assert.equal(isCreditTimeReached(null, "07:00"), true);
  assert.equal(isCreditTimeReached("abc", "10:00"), false);
});

test("số tiền lãi phù hợp với chu kỳ", () => {
  assert.equal(calculateProfitAmount(12_000_000, 12, "DAILY"), 12_000_000 * 0.12 / 365);
  assert.equal(calculateProfitAmount(12_000_000, 12, "MONTHLY"), 120_000);
  assert.equal(calculateProfitAmount(12_000_000, 12, "YEARLY"), 1_440_000);
});
