/**
 * Unit tests cho domains/renew-adobe/helpers/email.js
 *
 * Test:
 *   normalizeEmail    — trim + lowercase
 *   assertValidEmail  — validate format, throw khi invalid
 *   EMAIL_RE          — regex pattern
 */

const { normalizeEmail, assertValidEmail, EMAIL_RE } = require("@/domains/renew-adobe/helpers/email");

// ═══════════════════════════════════════════════════════════
// normalizeEmail
// ═══════════════════════════════════════════════════════════
describe("normalizeEmail", () => {
  it("trim whitespace và lowercase", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });

  it.each([null, undefined, ""])('input %s → ""', (val) => {
    expect(normalizeEmail(val)).toBe("");
  });

  it("giữ nguyên email hợp lệ đã lowercase", () => {
    expect(normalizeEmail("test@gmail.com")).toBe("test@gmail.com");
  });

  it("xử lý email có subdomain", () => {
    expect(normalizeEmail("user@mail.example.co.uk")).toBe("user@mail.example.co.uk");
  });
});

// ═══════════════════════════════════════════════════════════
// assertValidEmail
// ═══════════════════════════════════════════════════════════
describe("assertValidEmail", () => {
  it("trả email đã normalize khi hợp lệ", () => {
    expect(assertValidEmail("Test@Example.com")).toBe("test@example.com");
  });

  it("throw Error status 400 khi email không hợp lệ", () => {
    expect(() => assertValidEmail("not-an-email")).toThrow();
    try {
      assertValidEmail("invalid");
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.message).toBe("Email không hợp lệ.");
    }
  });

  it("throw với message tùy chỉnh", () => {
    expect(() => assertValidEmail("bad", "Custom error")).toThrow("Custom error");
  });

  it.each([null, undefined, "", "   "])("throw khi input là %s", (val) => {
    expect(() => assertValidEmail(val)).toThrow();
  });

  it("throw khi thiếu @", () => {
    expect(() => assertValidEmail("userexample.com")).toThrow();
  });

  it("throw khi thiếu domain", () => {
    expect(() => assertValidEmail("user@")).toThrow();
  });

  it("chấp nhận email có dấu + (plus addressing)", () => {
    expect(assertValidEmail("user+tag@example.com")).toBe("user+tag@example.com");
  });
});

// ═══════════════════════════════════════════════════════════
// EMAIL_RE
// ═══════════════════════════════════════════════════════════
describe("EMAIL_RE", () => {
  it.each([
    "user@example.com",
    "a@b.co",
    "user.name@domain.org",
    "user+tag@sub.domain.com",
  ])('"%s" → match', (email) => {
    expect(EMAIL_RE.test(email)).toBe(true);
  });

  it.each([
    "",
    "not-email",
    "@domain.com",
    "user@",
    "user @example.com",
    "user@ example.com",
  ])('"%s" → no match', (val) => {
    expect(EMAIL_RE.test(val)).toBe(false);
  });
});
