const SYSTEM_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
  "EACCES",
  "EPERM",
  "ENOENT",
]);

const isDatabaseError = (err) =>
  Boolean(err) && typeof err.code === "string" && /^[0-9A-Z]{5}$/.test(err.code) && Boolean(err.severity || err.routine);

const isSystemError = (err) =>
  Boolean(err) && (SYSTEM_ERROR_CODES.has(err.code) || typeof err.syscall === "string" || err.name === "KnexTimeoutError");

const isProgrammingError = (err) =>
  err instanceof TypeError || err instanceof ReferenceError || err instanceof SyntaxError || err instanceof RangeError;

/**
 * Trả về thông báo an toàn cho client: giữ lỗi nghiệp vụ, ẩn lỗi DB/hệ thống/lập trình.
 */
const getClientErrorMessage = (err, fallback = "Đã xảy ra lỗi, vui lòng thử lại sau.") => {
  if (!err || isDatabaseError(err) || isSystemError(err) || isProgrammingError(err)) return fallback;
  return typeof err.message === "string" && err.message.trim() ? err.message : fallback;
};

module.exports = { getClientErrorMessage, isDatabaseError, isSystemError };
