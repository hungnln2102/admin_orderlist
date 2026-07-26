/**
 * Supplier Payment Signature — encode/decode supplier_id vào đuôi số tiền.
 *
 * Quy tắc (Frontend & Backend đồng bộ):
 *   offset = ((supplierId - 1) % 100) + 1   // 1..100
 *   signedAmount = baseAmount - offset
 *
 * Ví dụ: NCC id=92, nợ 350,000 → signed = 350,000 - 92 = 349,908
 *
 * Decode: Không thể biết chính xác offset chỉ từ số tiền nếu baseAmount không
 * phải bội 1000. Hàm hasSupplierSignature() trả về offset ứng với giả định
 * baseAmount là bội 1000 gần nhất. autoSettleSupplierPayment sẽ xác nhận
 * khớp qua tolerance query.
 */

const SIGNATURE_MODULUS = 100;
const SIGNATURE_DETECT_THRESHOLD = SIGNATURE_MODULUS; // offset tối đa = 100

/**
 * Encode supplier_id vào đuôi số tiền (trừ offset).
 * Đồng bộ với frontend/src/features/supply/utils/supplierPaymentSignature.ts
 *
 * @param {number} baseAmount — Số tiền nợ gốc (VND, luôn dương).
 * @param {number} supplierId — ID supplier (>= 1).
 * @returns {number} Số tiền đã encode signature.
 */
const encodeSupplierSignature = (baseAmount, supplierId) => {
  const base = Math.round(Math.abs(baseAmount));
  if (base <= 0) return 0;
  const normalizedSupplierId = Math.max(1, Math.abs(Math.trunc(Number(supplierId) || 1)));
  const offset = ((normalizedSupplierId - 1) % SIGNATURE_MODULUS) + 1;
  return Math.max(1, base - offset);
};

/**
 * Decode supplier_id từ số tiền đã encode.
 * Giả định baseAmount là bội của 1000 (thực tế gần như luôn đúng với nhập hàng).
 * Nếu không phải bội 1000, autoSettle sẽ fail tolerance check và trả về null.
 *
 * @param {number} signedAmount — Số tiền đã encode (VND, luôn dương).
 * @returns {{ supplierId: number, baseAmount: number }}
 */
const decodeSupplierSignature = (signedAmount) => {
  const abs = Math.round(Math.abs(signedAmount));
  if (abs <= 0) return { supplierId: 0, baseAmount: 0 };

  const remainder = abs % 1000;
  // offset = 1..100, nên phần dư % 1000 sẽ nằm trong khoảng [900, 999]
  if (remainder >= (1000 - SIGNATURE_DETECT_THRESHOLD) && remainder < 1000) {
    const offset = 1000 - remainder;
    const baseAmount = abs + offset;
    const supplierId = offset; // offset = ((supplierId-1)%100)+1, với ID 1..100 thì offset == supplierId
    return { supplierId, baseAmount };
  }

  return { supplierId: 0, baseAmount: 0 };
};

/**
 * Kiểm tra nhanh xem số tiền có dạng chữ ký supplier hay không
 * (phần dư % 1000 nằm trong vùng offset 1..100).
 *
 * @param {number} amount — Số tiền tuyệt đối.
 * @returns {boolean}
 */
const hasSupplierSignature = (amount) => {
  const abs = Math.round(Math.abs(amount));
  if (abs <= 0) return false;
  const remainder = abs % 1000;
  return remainder >= (1000 - SIGNATURE_DETECT_THRESHOLD) && remainder < 1000;
};

module.exports = {
  SIGNATURE_MODULUS,
  SIGNATURE_DETECT_THRESHOLD,
  encodeSupplierSignature,
  decodeSupplierSignature,
  hasSupplierSignature,
};
