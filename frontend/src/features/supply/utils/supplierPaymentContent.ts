/** Kỳ TT trả NCC: DDMMYYYY */
export function formatPaySupplierPeriod(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}${month}${year}`;
}

/** Kỳ nội dung hoàn (RF): YYYYDDMM — ví dụ 30/04/2026 → 20263004 */
export function formatRefundPaymentPeriod(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${year}${day}${month}`;
}

/** Cố định trong nội dung CK hoàn tiền (RF) — không gắn mã đơn vì một kỳ có nhiều đơn. */
export const NCC_REFUND_TRANSFER_LABEL = "MAVRYK";

export function buildPaySupplierContent(supplierName: string, date: Date = new Date()): string {
  const name = String(supplierName || "").trim() || "NCC";
  return `TT ${name} kỳ ${formatPaySupplierPeriod(date)}`;
}

/** `RF MAVRYK <kỳ YYYYDDMM>` — ví dụ `RF MAVRYK 20263004` */
export function buildRefundSupplierContent(date: Date = new Date()): string {
  return `RF ${NCC_REFUND_TRANSFER_LABEL} ${formatRefundPaymentPeriod(date)}`;
}

export type NccTransferContentParams = {
  /**
   * Số dư công nợ NCC theo đơn (cùng dấu với API `totalImport` / chênh chu kỳ).
   * - \> 0: shop còn nợ NCC → nội dung thanh toán tiền hàng (TT …).
   * - \< 0: NCC hoàn cho shop → nội dung hoàn tiền (RF MAVRYK …).
   */
  balanceSigned: number;
  supplierName: string;
  date?: Date;
};

/**
 * Hai luồng nội dung chuyển khoản (VietQR / Sepay đối soái).
 * Chưa thanh toán dương → TT; âm → RF MAVRYK.
 */
export function buildNccTransferContentByBalance({
  balanceSigned,
  supplierName,
  date = new Date(),
}: NccTransferContentParams): string {
  if (balanceSigned < 0) {
    return buildRefundSupplierContent(date);
  }
  return buildPaySupplierContent(supplierName, date);
}
