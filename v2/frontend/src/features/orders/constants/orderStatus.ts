/**
 * Hằng số Trạng thái Đơn hàng chuẩn hóa cho V2 (Frontend Order Status Constants)
 */
export const ORDER_STATUS = {
  UNPAID: 'UNPAID',
  PAID: 'PAID',
  RENEW_REQUIRED: 'RENEW_REQUIRED',
  EXPIRED: 'EXPIRED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  CANCELED: 'CANCELED',
} as const;

export type OrderStatusValue = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/**
 * Nhãn hiển thị Tiếng Việt ứng với từng trạng thái
 */
export const ORDER_STATUS_LABELS: Record<OrderStatusValue, string> = {
  [ORDER_STATUS.UNPAID]: 'Chưa Thanh Toán',
  [ORDER_STATUS.PAID]: 'Đã Thanh Toán',
  [ORDER_STATUS.RENEW_REQUIRED]: 'Cần Gia Hạn',
  [ORDER_STATUS.EXPIRED]: 'Hết Hạn',
  [ORDER_STATUS.REFUND_PENDING]: 'Chưa Hoàn Tiền',
  [ORDER_STATUS.REFUNDED]: 'Đã Hoàn Tiền',
  [ORDER_STATUS.CANCELED]: 'Đã Hủy',
};

/**
 * Lấy nhãn tiếng Việt tương ứng từ mã status
 */
export function getOrderStatusLabel(status?: string | null): string {
  if (!status) return ORDER_STATUS_LABELS[ORDER_STATUS.UNPAID];
  return ORDER_STATUS_LABELS[status as OrderStatusValue] || status;
}
