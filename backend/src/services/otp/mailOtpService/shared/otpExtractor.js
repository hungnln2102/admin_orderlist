/**
 * Pure text helpers + predicates dùng để tìm/loại mail OTP.
 * Không phụ thuộc IMAP / DB — có thể unit test riêng.
 */

/** Gỡ thẻ HTML để lấy chữ (tránh OTP nằm trong <span>123</span><span>456</span>) */
function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Trích mã OTP 6 hoặc 8 chữ số từ chuỗi (email body).
 * @param {string} text
 * @returns {string|null}
 */
function extractOtpFromText(text) {
  if (!text || typeof text !== "string") return null;
  const raw = stripHtml(text);
  const t = raw.replace(/\s+/g, " ");
  // Ưu tiên: 6 hoặc 8 chữ số sau từ khóa (code, Bestätigungscode, mã, ...)
  const re = /\b(\d{6})\b|(?:code|mã|verification|bestätigungscode|lautet|confirmation|bestätigung)\s*[:\s]*(\d{6})\b|\b(\d{8})\b/gi;
  let m = re.exec(t);
  if (m) {
    const code = String(m[1] || m[2] || m[3] || "").trim();
    if (code.length >= 6) return code.slice(0, 8);
  }
  // Fallback: 6 chữ số có thể cách nhau bằng space/dash (123 456, 123-456)
  const withSep = /(\d{3}\s*[-.\s]\s*\d{3})/g;
  while ((m = withSep.exec(t)) !== null) {
    const code = (m[1] || "").replace(/\D/g, "");
    if (code.length === 6) return code;
  }
  // Fallback: bất kỳ chuỗi 6 hoặc 8 chữ số (thường là OTP)
  const fallback = /(\d{6,8})/g;
  let lastMatch = null;
  while ((m = fallback.exec(t)) !== null) lastMatch = m[1];
  if (lastMatch) return lastMatch.length >= 6 ? lastMatch.slice(0, 8) : null;
  return null;
}

/** Predicate: email có được coi là từ Adobe không (From + body). From có thể là "Adobe 5", "Cyrus Devil", hoặc địa chỉ @adobe.com */
function isAdobeEmail(fromHeader, bodyText) {
  const from = (fromHeader || "").toLowerCase();
  const body = (bodyText || "").toLowerCase();
  return (
    /\badobe\b|@adobe\.com|adobe\.com/.test(from) ||
    /@adobe\.com|noreply@.*adobe|adobe.*verification|message@adobe|\badobe\b/.test(body)
  );
}

/** Predicate: nội dung có phải mail xác minh/OTP không (đa ngôn ngữ: EN, VI, DE, ...) */
function isVerificationEmail(bodyText) {
  const t = (bodyText || "").toLowerCase();
  return (
    /verification|verify|mã xác minh|your code|one-time|confirmation code|bestätigungscode|confirmationcode/i.test(t) ||
    /codigo de verificaci[oó]n|code de v[eé]rification|確認コード|验证码|کد تأیید/i.test(t) ||
    /lautet\s*:?\s*\d{6}|dein bestätigungscode|your verification code/i.test(t)
  );
}

module.exports = {
  stripHtml,
  extractOtpFromText,
  isAdobeEmail,
  isVerificationEmail,
};
