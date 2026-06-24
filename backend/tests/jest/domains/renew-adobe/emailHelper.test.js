const {
  assertValidEmail,
  normalizeEmail,
} = require("../../../../src/domains/renew-adobe/helpers/email");

describe("renew-adobe email helper", () => {
  test("normalizes email by trimming and lowercasing", () => {
    expect(normalizeEmail(" User@Example.COM ")).toBe("user@example.com");
    expect(normalizeEmail(null)).toBe("");
  });

  test("assertValidEmail returns normalized email", () => {
    expect(assertValidEmail(" User@Example.COM ")).toBe("user@example.com");
  });

  test("assertValidEmail throws 400 for invalid email", () => {
    expect(() => assertValidEmail("invalid")).toThrow("Email không hợp lệ.");
    try {
      assertValidEmail("invalid");
    } catch (error) {
      expect(error.status).toBe(400);
    }
  });
});
