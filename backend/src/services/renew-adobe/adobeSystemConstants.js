/**
 * Danh sách hệ thống fix Adobe được hỗ trợ — đồng bộ với dropdown ở UI
 * (frontend `features/renew-adobe/user-orders/system-options.ts`).
 *
 * Khi thêm hệ thống mới: bổ sung `code` ở đây + label tương ứng phía FE.
 */

const ADOBE_SYSTEM_CODES = [
  "renew_adobe",
  "fix_adobe_edu",
  "fix_ades",
];

const DEFAULT_ADOBE_SYSTEM_CODE = "renew_adobe";

const ALLOWED_ADOBE_SYSTEM_CODES = new Set(ADOBE_SYSTEM_CODES);

function normalizeAdobeSystemCode(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return DEFAULT_ADOBE_SYSTEM_CODE;
  return ALLOWED_ADOBE_SYSTEM_CODES.has(v) ? v : DEFAULT_ADOBE_SYSTEM_CODE;
}

module.exports = {
  ADOBE_SYSTEM_CODES,
  DEFAULT_ADOBE_SYSTEM_CODE,
  ALLOWED_ADOBE_SYSTEM_CODES,
  normalizeAdobeSystemCode,
};
