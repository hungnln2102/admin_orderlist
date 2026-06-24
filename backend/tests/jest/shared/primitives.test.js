const { normalizeOptionalText } = require("../../../src/shared/text/normalizeOptionalText");
const { normalizeBoolean } = require("../../../src/shared/validation/normalizeBoolean");

describe("shared primitive normalizers", () => {
  test.each([
    [null, null],
    [undefined, null],
    ["", null],
    ["   ", null],
    [" value ", "value"],
  ])("normalizeOptionalText(%p)", (input, expected) => {
    expect(normalizeOptionalText(input)).toBe(expected);
  });

  test.each([
    [true, false, true],
    [false, true, false],
    ["yes", false, true],
    ["1", false, true],
    ["no", true, false],
    ["0", true, false],
    ["unknown", true, true],
    [undefined, false, false],
  ])("normalizeBoolean(%p, %p)", (input, fallback, expected) => {
    expect(normalizeBoolean(input, fallback)).toBe(expected);
  });
});
