const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function assertValidEmail(value, message = "Email không hợp lệ.") {
  const email = normalizeEmail(value);
  if (!email || !EMAIL_RE.test(email)) {
    const err = new Error(message);
    err.status = 400;
    throw err;
  }
  return email;
}

module.exports = {
  EMAIL_RE,
  assertValidEmail,
  normalizeEmail,
};
