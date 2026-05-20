const {
  TRANSACTION_CODE_LENGTH,
  generateTransactionCode,
  normalizeTransactionCode,
} = require("../../../src/services/transactionCodeService");

describe("transactionCodeService", () => {
  test("generates fixed-length alphanumeric codes", () => {
    const code = generateTransactionCode();
    expect(code).toHaveLength(TRANSACTION_CODE_LENGTH);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  test("normalizeTransactionCode accepts only exact length", () => {
    expect(normalizeTransactionCode("abc12def")).toBe("ABC12DEF");
    expect(normalizeTransactionCode("MAVC12345")).toBe("");
    expect(normalizeTransactionCode("short")).toBe("");
  });
});
