/**
 * Tạo URL ảnh VietQR (Sepay / compact.png) cho thanh toán.
 */

const {
  QR_ACCOUNT_NUMBER,
  QR_BANK_CODE,
  QR_ACCOUNT_NAME,
} = require("./constants");

/**
 * Build VietQR URL with compact.png format
 * Format: https://img.vietqr.io/image/{BANK_CODE}-{ACCOUNT}-compact.png?amount=...&addInfo=...&accountName=...
 */
function buildSepayQrUrl({
  accountNumber,
  bankCode,
  amount,
  description,
  accountName,
}) {
  const acc = String(accountNumber || "").trim();
  const bank = String(bankCode || "").trim();
  if (!acc || !bank) return "";

  const params = new URLSearchParams();

  const numericAmount = Number(amount);
  if (Number.isFinite(numericAmount) && numericAmount > 0) {
    params.set("amount", Math.round(numericAmount).toString());
  }

  const desc = String(description || "").trim();
  if (desc) {
    params.set("addInfo", desc);
  }

  const name = String(accountName || "").trim();
  if (name) {
    params.set("accountName", name);
  }

  const queryString = params.toString();
  return `https://img.vietqr.io/image/${bank}-${acc}-compact.png${queryString ? `?${queryString}` : ""}`;
}

/**
 * Build VietQR URL for due order notifications (giống mavrykstore_bot)
 */
function buildVietQrUrl({ amount, orderCode }) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return "";

  const params = new URLSearchParams();
  params.set("amount", Math.round(numericAmount).toString());
  params.set("addInfo", `Thanh toan ${orderCode}`);
  params.set("accountName", QR_ACCOUNT_NAME);

  return `https://img.vietqr.io/image/${QR_BANK_CODE}-${QR_ACCOUNT_NUMBER}-compact.png?${params.toString()}`;
}

module.exports = {
  buildSepayQrUrl,
  buildVietQrUrl,
};
