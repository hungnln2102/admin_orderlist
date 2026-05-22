const {
  validateWithdrawnPayload,
  parseWithdrawnAmount,
} = require("../../../../src/domains/shop-bank-accounts/validators/shopBankWithdrawnValidator");

describe("shopBankWithdrawnValidator", () => {
  test("parses formatted VND amount", () => {
    expect(parseWithdrawnAmount("20.000.000")).toBe(20000000);
    expect(parseWithdrawnAmount(1500000)).toBe(1500000);
  });

  test("validateWithdrawnPayload accepts camelCase and snake_case", () => {
    expect(validateWithdrawnPayload(3, { totalWithdrawn: "1.000.000" })).toEqual({
      id: 3,
      totalWithdrawn: 1000000,
    });
    expect(validateWithdrawnPayload("5", { total_withdrawn: 0 })).toEqual({
      id: 5,
      totalWithdrawn: 0,
    });
  });

  test("rejects invalid id and negative amounts", () => {
    expect(() => validateWithdrawnPayload("x", { totalWithdrawn: 1 })).toThrow(
      "ID tài khoản không hợp lệ."
    );
    expect(() => validateWithdrawnPayload(1, {})).toThrow("Số tiền đã rút là bắt buộc.");
  });
});
