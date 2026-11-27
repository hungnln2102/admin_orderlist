const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const durationUtilsUrl = pathToFileURL(
  path.resolve(__dirname, "../../../frontend/src/features/orders/utils/durationUtils.ts")
).href;

let durationUtilsPromise;
function loadDurationUtils() {
  if (!durationUtilsPromise) {
    durationUtilsPromise = import(durationUtilsUrl);
  }
  return durationUtilsPromise;
}

test("calculateExpirationDateFromStart: Zoom 12 months starts 2026-11-28 -> ends 2027-11-27 with 365 inclusive days", async () => {
  const { calculateExpirationDateFromStart } = await loadDurationUtils();
  const result = calculateExpirationDateFromStart("2026-11-28", "Zoom 100 Người (12 tháng)");
  assert.equal(result.expired_at, "2027-11-27");
  assert.equal(result.days, 365);
});

test("calculateExpirationDateFromStart: Youtube_Fam--3m includes the start date and ends the day before the next cycle", async () => {
  const { calculateExpirationDateFromStart } = await loadDurationUtils();
  const result = calculateExpirationDateFromStart("2026-10-09", "Youtube_Fam--3m");
  assert.equal(result.expired_at, "2027-01-08");
  assert.equal(result.days, 92);
});

test("calculateExpirationDateFromStart: 1 month package starts on 2026-10-09 and ends on 2026-11-08 (31 inclusive days)", async () => {
  const { calculateExpirationDateFromStart } = await loadDurationUtils();
  const result = calculateExpirationDateFromStart("2026-10-09", "Adobe_Renew--1m");
  assert.equal(result.expired_at, "2026-11-08");
  assert.equal(result.days, 31);
});

test("calculateExpirationDateFromStart: 1 year package starts on 2026-10-09 and ends on 2027-10-08 (365 inclusive days)", async () => {
  const { calculateExpirationDateFromStart } = await loadDurationUtils();
  const result = calculateExpirationDateFromStart("2026-10-09", "Canva Pro --1y");
  assert.equal(result.expired_at, "2027-10-08");
  assert.equal(result.days, 365);
});

test("calculateExpirationDateFromStart: 27/10 + 1 month ends on 26/11 (31 inclusive days)", async () => {
  const { calculateExpirationDateFromStart } = await loadDurationUtils();
  const result = calculateExpirationDateFromStart("2026-10-27", "Adobe_Renew2--1m");
  assert.equal(result.expired_at, "2026-11-26");
  assert.equal(result.days, 31);
});

test("calculateExpirationDateFromStart: 12/11 + 1 month ends on 11/12 (30 inclusive days)", async () => {
  const { calculateExpirationDateFromStart } = await loadDurationUtils();
  const result = calculateExpirationDateFromStart("2026-11-12", "Adobe_Renew2--1m");
  assert.equal(result.expired_at, "2026-12-11");
  assert.equal(result.days, 30);
});

test("calculateExpirationDateFromStart: End of month edge case (31/01 -> 27/02 in non-leap year)", async () => {
  const { calculateExpirationDateFromStart } = await loadDurationUtils();
  const result = calculateExpirationDateFromStart("2026-01-31", "--1m");
  assert.equal(result.expired_at, "2026-02-27");
  assert.equal(result.days, 28);
});

test("calculateExpirationDateFromStart: day-based package (--30d) ends inclusively on start + 29 days", async () => {
  const { calculateExpirationDateFromStart } = await loadDurationUtils();
  const result = calculateExpirationDateFromStart("2026-11-01", "Trial --30d");
  assert.equal(result.expired_at, "2026-11-30");
  assert.equal(result.days, 30);
});

test("calculateInclusiveDays: manual end-date selection matches inclusive day count", async () => {
  const { calculateInclusiveDays } = await loadDurationUtils();
  assert.equal(calculateInclusiveDays("2026-11-28", "2027-11-27"), 365);
  assert.equal(calculateInclusiveDays("2026-11-28", "2026-11-28"), 1);
});
