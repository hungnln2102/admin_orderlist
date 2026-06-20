/**
 * Supplier Payment Signature — tạo lệch âm nhỏ cho khoản chi NCC.
 *
 * Quy tắc:
 *   signedAmount = baseAmount - offset
 *   offset = 1..100đ, ổn định theo supplierId để QR không đổi liên tục khi re-render.
 */

const SIGNATURE_MODULUS = 100;

/**
 * Tạo số tiền chi NCC nhỏ hơn số nợ gốc từ 1đ đến 100đ.
 * @param baseAmount — Số tiền nợ gốc (VND, luôn dương).
 * @param supplierId — ID supplier, dùng để tạo offset ổn định.
 * @returns Số tiền đã trừ signature.
 */
export const encodeSupplierSignature = (
  baseAmount: number,
  supplierId: number
): number => {
  const base = Math.round(Math.abs(baseAmount));
  if (base <= 0) return 0;
  const normalizedSupplierId = Math.max(1, Math.abs(Math.trunc(Number(supplierId) || 1)));
  const offset = ((normalizedSupplierId - 1) % SIGNATURE_MODULUS) + 1;
  return Math.max(1, base - offset);
};
