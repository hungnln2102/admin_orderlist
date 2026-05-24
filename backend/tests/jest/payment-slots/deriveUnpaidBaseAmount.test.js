const { deriveUnpaidBaseAmount } = require("../../../src/domains/payment-slots/use-cases/backfill/deriveUnpaidBaseAmount");

describe("deriveUnpaidBaseAmount", () => {
  test("keeps round VND price", () => {
    expect(deriveUnpaidBaseAmount(65000)).toBe(65000);
    expect(deriveUnpaidBaseAmount(220000)).toBe(220000);
  });

  test("strips suffix 1..100 when base is round thousands", () => {
    expect(deriveUnpaidBaseAmount(65017)).toBe(65000);
    expect(deriveUnpaidBaseAmount(220003)).toBe(220000);
  });

  test("does not strip when remainder is not a payment suffix pattern", () => {
    expect(deriveUnpaidBaseAmount(65117)).toBe(65117);
  });
});
