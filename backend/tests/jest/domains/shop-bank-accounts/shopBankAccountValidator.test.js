const {
  validateCreatePayload,
} = require("../../../../src/domains/shop-bank-accounts/validators/shopBankAccountValidator");

describe("shopBankAccountValidator", () => {
  test("validateCreatePayload accepts valid row", () => {
    const row = validateCreatePayload({
      accountNumber: " 123456789 ",
      accountHolder: "NGUYEN VAN A",
      bankBin: "970432",
      bankShortCode: "VPB",
    });
    expect(row.accountNumber).toBe("123456789");
    expect(row.bankBin).toBe("970432");
  });

  test("rejects invalid BIN", () => {
    expect(() =>
      validateCreatePayload({
        accountNumber: "1",
        accountHolder: "A",
        bankBin: "12",
      })
    ).toThrow(/BIN/);
  });
});
