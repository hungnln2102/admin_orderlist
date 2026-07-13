function normalizeSavedCookiesFromDb(raw) {
  if (raw == null) return null;
  let obj = raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      obj = parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      return null;
    }
  }
  if (!obj || Array.isArray(obj) || typeof obj !== "object") return null;
  if (!Array.isArray(obj.cookies) || obj.cookies.length === 0) return null;
  return obj;
}

module.exports = { normalizeSavedCookiesFromDb };
