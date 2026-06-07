/**
 * Supplier Payment Signature — encode/decode supplier_id vào đuôi số tiền.
 *
 * Quy tắc:
 *   signedAmount = floor(baseAmount / 1000) * 1000 + (supplierId % 1000)
 *
 * Ví dụ: NCC id=2, nợ 1,246,000 → signed = 1,246,002
 */

const SIGNATURE_MODULUS = 1000;

/**
 * Encode supplier_id vào đuôi số tiền.
 * @param {number} baseAmount — Số tiền nợ gốc (VND, luôn dương).
 * @param {number} supplierId — ID supplier (1..999).
 * @returns {number} Số tiền đã encode signature.
 */
const encodeSupplierSignature = (baseAmount, supplierId) => {
  const base = Math.floor(Math.abs(baseAmount) / SIGNATURE_MODULUS) * SIGNATURE_MODULUS;
  const suffix = Math.abs(Number(supplierId) || 0) % SIGNATURE_MODULUS;
  return base + suffix;
};

/**
 * Decode supplier_id từ số tiền đã encode.
 * @param {number} signedAmount — Số tiền đã encode (VND, luôn dương).
 * @returns {{ supplierId: number, baseAmount: number }}
 */
const decodeSupplierSignature = (signedAmount) => {
  const abs = Math.abs(signedAmount);
  const suffix = abs % SIGNATURE_MODULUS;
  const baseAmount = abs - suffix;
  return { supplierId: suffix, baseAmount };
};

module.exports = {
  SIGNATURE_MODULUS,
  encodeSupplierSignature,
  decodeSupplierSignature,
};
