const {
  normalizeIntegerVndAmount,
  normalizeNonNegativeIntegerVndAmount,
} = require("../../../../src/shared/money/normalizers");

describe("shared money normalizers", () => {
  test.each([
    [1000, 1000],
    [1000.4, 1000],
    [1000.5, 1001],
    ["1,234,567", 1234567],
    [" 1,234 VND ", 1234],
    ["abc 12.6 đ", 13],
    [null, 0],
    [undefined, 0],
    ["", 0],
    ["invalid", 0],
  ])("normalizes %p to %p", (input, expected) => {
    expect(normalizeIntegerVndAmount(input)).toBe(expected);
  });

  test.each([
    [-1000, 0],
    ["-1,250", 0],
    ["500.6", 501],
    ["invalid", 0],
  ])("clamps negative integer VND amounts for %p", (input, expected) => {
    expect(normalizeNonNegativeIntegerVndAmount(input)).toBe(expected);
  });
});
