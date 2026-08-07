/**
 * Unit tests cho domains/renew-adobe/helpers/normalizeTrackingOtpSource.js
 *
 * Test:
 *   normalizeTrackingOtpSource — chuẩn hóa giá trị OTP source cho tracking
 *   TRACKING_OTP_NONE          — constant "none"
 */

jest.mock("@/services/otp/otpProviderService", () => ({
  normalizeOtpSource: jest.fn((val) => {
    // Mock nhẹ: trả lại chính giá trị đã lowercase
    const known = ["imap", "tinyhost", "hdsd", "ades", "yuna"];
    return known.includes(val) ? val : "imap";
  }),
}));

const {
  normalizeTrackingOtpSource,
  TRACKING_OTP_NONE,
} = require("@/domains/renew-adobe/helpers/normalizeTrackingOtpSource");
const { normalizeOtpSource } = require("@/services/otp/otpProviderService");

// ═══════════════════════════════════════════════════════════
// TRACKING_OTP_NONE
// ═══════════════════════════════════════════════════════════
describe("TRACKING_OTP_NONE", () => {
  it('bằng "none"', () => {
    expect(TRACKING_OTP_NONE).toBe("none");
  });
});

// ═══════════════════════════════════════════════════════════
// normalizeTrackingOtpSource
// ═══════════════════════════════════════════════════════════
describe("normalizeTrackingOtpSource", () => {
  beforeEach(() => {
    normalizeOtpSource.mockClear();
  });

  it('"none" → "none" (không gọi normalizeOtpSource)', () => {
    expect(normalizeTrackingOtpSource("none")).toBe("none");
    expect(normalizeOtpSource).not.toHaveBeenCalled();
  });

  it('"None" / "NONE" → "none" (case insensitive)', () => {
    expect(normalizeTrackingOtpSource("None")).toBe("none");
    expect(normalizeTrackingOtpSource("NONE")).toBe("none");
  });

  it.each(["", null, undefined])('input %s → "none"', (val) => {
    expect(normalizeTrackingOtpSource(val)).toBe("none");
    expect(normalizeOtpSource).not.toHaveBeenCalled();
  });

  it('"yuna" → delegate cho normalizeOtpSource', () => {
    const result = normalizeTrackingOtpSource("yuna");
    expect(normalizeOtpSource).toHaveBeenCalledWith("yuna");
    expect(result).toBe("yuna");
  });

  it('"imap" → delegate cho normalizeOtpSource', () => {
    const result = normalizeTrackingOtpSource("imap");
    expect(normalizeOtpSource).toHaveBeenCalledWith("imap");
    expect(result).toBe("imap");
  });

  it('"YUNA" → lowercase trước rồi delegate', () => {
    const result = normalizeTrackingOtpSource("YUNA");
    expect(normalizeOtpSource).toHaveBeenCalledWith("yuna");
    expect(result).toBe("yuna");
  });

  it("whitespace → trim trước khi xử lý", () => {
    expect(normalizeTrackingOtpSource("  none  ")).toBe("none");
    expect(normalizeOtpSource).not.toHaveBeenCalled();
  });

  it("giá trị unknown → delegate cho normalizeOtpSource (fallback)", () => {
    const result = normalizeTrackingOtpSource("unknown_source");
    expect(normalizeOtpSource).toHaveBeenCalledWith("unknown_source");
    // Mock trả "imap" cho unknown → verify delegation
    expect(result).toBe("imap");
  });
});
