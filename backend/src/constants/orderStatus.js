/**
 * Hằng số Trạng thái Đơn hàng chuẩn hóa cho V2 (Order Status Constants)
 */
const ORDER_STATUS = Object.freeze({
  UNPAID: 'UNPAID',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  RENEW_REQUIRED: 'RENEW_REQUIRED',
  EXPIRED: 'EXPIRED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  CANCELED: 'CANCELED',
});

/**
 * Nhãn hiển thị Tiếng Việt ứng với từng trạng thái
 */
const ORDER_STATUS_LABELS = Object.freeze({
  [ORDER_STATUS.UNPAID]: 'Chưa Thanh Toán',
  [ORDER_STATUS.PROCESSING]: 'Đang Xử Lý',
  [ORDER_STATUS.PAID]: 'Đã Thanh Toán',
  [ORDER_STATUS.RENEW_REQUIRED]: 'Cần Gia Hạn',
  [ORDER_STATUS.EXPIRED]: 'Hết Hạn',
  [ORDER_STATUS.REFUND_PENDING]: 'Chưa Hoàn Tiền',
  [ORDER_STATUS.REFUNDED]: 'Đã Hoàn Tiền',
  [ORDER_STATUS.CANCELED]: 'Đã Hủy',
});

const getOrderStatusLabel = (status) => {
  return ORDER_STATUS_LABELS[status] || status || "Không rõ";
};

module.exports = {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  getOrderStatusLabel,
};
