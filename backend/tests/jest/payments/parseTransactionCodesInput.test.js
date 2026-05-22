const {
  parseTransactionCodesInput,
  normalizeTransactionToken,
} = require("../../../src/domains/payments/controller/shared/parseTransactionCodesInput");

describe("parseTransactionCodesInput", () => {
  test("parses 8-char codes separated by comma or newline", () => {
    expect(parseTransactionCodesInput("A1B2C3D4, X9Y8Z7W6")).toEqual([
      "A1B2C3D4",
      "X9Y8Z7W6",
    ]);
    expect(parseTransactionCodesInput("A1B2C3D4\nX9Y8Z7W6")).toEqual([
      "A1B2C3D4",
      "X9Y8Z7W6",
    ]);
  });

  test("rejects MAV order codes and MAVG batch codes", () => {
    expect(normalizeTransactionToken("MAVC7MN92")).toBe("");
    expect(normalizeTransactionToken("MAVGC7F12")).toBe("");
    expect(parseTransactionCodesInput("MAVC7MN92 MAVGC7F12F4F")).toEqual([]);
  });
});
