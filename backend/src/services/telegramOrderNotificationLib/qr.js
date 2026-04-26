/**
 * URL ảnh VietQR qua img.vietqr.io — mẫu compact (540×540): QR + VietQR + Napas + ngân hàng.
 * @see https://www.vietqr.io/danh-sach-api/link-tao-ma-nhanh/api-tao-ma-qr/
 */

const {
  QR_ACCOUNT_NUMBER,
  QR_BANK_CODE,
  QR_ACCOUNT_NAME,
  QR_NOTE_PREFIX,
} = require("./constants");

const VIETQR_IMAGE_TEMPLATE = "compact";

/**
 * Format: https://img.vietqr.io/image/{BANK_CODE}-{ACCOUNT}-{template}.png?amount=...&addInfo=...&accountName=...
 */
function buildSepayQrUrl({
  accountNumber,
  bankCode,
  amount,
  description,
  accountName,
  template = VIETQR_IMAGE_TEMPLATE,
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
  const tpl = String(template || VIETQR_IMAGE_TEMPLATE).trim() || VIETQR_IMAGE_TEMPLATE;
  return `https://img.vietqr.io/image/${bank}-${acc}-${tpl}.png${queryString ? `?${queryString}` : ""}`;
}

/**
 * Build VietQR URL for due order notifications (giống mavrykstore_bot)
 */
function buildVietQrUrl({ amount, orderCode }) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return "";

  const params = new URLSearchParams();
  params.set("amount", Math.round(numericAmount).toString());
  const note = [QR_NOTE_PREFIX, String(orderCode || "").trim()].filter(Boolean).join(" ").trim();
  if (note) {
    params.set("addInfo", note);
  }
  params.set("accountName", QR_ACCOUNT_NAME);

  return `https://img.vietqr.io/image/${QR_BANK_CODE}-${QR_ACCOUNT_NUMBER}-${VIETQR_IMAGE_TEMPLATE}.png?${params.toString()}`;
}

module.exports = {
  buildSepayQrUrl,
  buildVietQrUrl,
  VIETQR_IMAGE_TEMPLATE,
};
