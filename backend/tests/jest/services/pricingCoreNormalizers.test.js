const {
  normalizeMoney,
  normalizeImportValue,
  resolveMoney,
} = require("@/services/pricing/core");

describe("pricing core money normalizers", () => {
  test.each([
    [1000, 1000],
    [1000.5, 1001],
    ["1,234", 1234],
    [" 1 234 ", 1234],
    ["abc 12.6 đ", 126],
    [null, 0],
    [undefined, 0],
    ["invalid", 0],
  ])("normalizeMoney keeps pricing-specific parsing for %p", (input, expected) => {
    expect(normalizeMoney(input)).toBe(expected);
  });

  test("normalizeImportValue scales down legacy import values by reference ratio", () => {
    expect(normalizeImportValue(100000, 1000)).toEqual({
      value: 1000,
      scaled: true,
      reference: 1000,
    });
  });

  test("resolveMoney returns first positive normalized fallback", () => {
    expect(resolveMoney(null, "0", "12,500", 1000)).toBe(12500);
  });
});
