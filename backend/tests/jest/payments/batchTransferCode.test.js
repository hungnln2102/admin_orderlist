const {
  isBatchTransferCodeFormat,
  isLegacyBatchTransferCode,
} = require("../../../src/domains/payments/controller/shared/batchTransferCode");

describe("batchTransferCode", () => {
  test("accepts 8-char transfer codes", () => {
    expect(isBatchTransferCodeFormat("K7M2NP4Q")).toBe(true);
  });

  test("accepts legacy MAVG batch codes", () => {
    expect(isLegacyBatchTransferCode("MAVGDB9FB743")).toBe(true);
    expect(isBatchTransferCodeFormat("MAVGDB9FB743")).toBe(true);
  });

  test("rejects MAV order codes", () => {
    expect(isBatchTransferCodeFormat("MAVC7MN92")).toBe(false);
  });
});
