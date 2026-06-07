/**
 * Supplier Payment Signature — encode supplier_id vào đuôi số tiền.
 *
 * Quy tắc:
 *   signedAmount = floor(baseAmount / 1000) * 1000 + (supplierId % 1000)
 */

const SIGNATURE_MODULUS = 1000;

/**
 * Encode supplier_id vào đuôi số tiền.
 * @param baseAmount — Số tiền nợ gốc (VND, luôn dương).
 * @param supplierId — ID supplier (1..999).
 * @returns Số tiền đã encode signature.
 */
export const encodeSupplierSignature = (
  baseAmount: number,
  supplierId: number
): number => {
  const base =
    Math.floor(Math.abs(baseAmount) / SIGNATURE_MODULUS) * SIGNATURE_MODULUS;
  const suffix = Math.abs(Number(supplierId) || 0) % SIGNATURE_MODULUS;
  return base + suffix;
};
