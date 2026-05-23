const { normalizeOtpSource } = require("../../../services/otpProviderService");

const TRACKING_OTP_NONE = "none";

function normalizeTrackingOtpSource(rawValue) {
  const normalized = String(rawValue ?? "")
    .trim()
    .toLowerCase();

  if (normalized === TRACKING_OTP_NONE || normalized === "") {
    return TRACKING_OTP_NONE;
  }

  return normalizeOtpSource(normalized);
}

module.exports = {
  TRACKING_OTP_NONE,
  normalizeTrackingOtpSource,
};
