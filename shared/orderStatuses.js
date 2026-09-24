export const ORDER_STATUS = {
  UNPAID: "Chưa Thanh Toán",
  PROCESSING: "Đang Xử Lý",
  PAID: "Đã Thanh Toán",
  CANCELED: "Hủy",
  REFUNDED: "Đã Hoàn",
  PENDING_REFUND: "Chưa Hoàn",
  CREDIT_CONVERTED: "Chuyển đổi credit",
  EXPIRED: "Hết Hạn",
  RENEWAL: "Cần Gia Hạn",
};

/**
 * Trạng thái thanh toán NCC — dùng cho cột `supplier_order_cost_log.ncc_payment_status`.
 * Tách biệt với ORDER_STATUS vì thuộc domain NCC (nhà cung cấp).
 */
export const NCC_PAYMENT_STATUS = {
  UNPAID: "Chưa Thanh Toán",
  PAID: "Đã Thanh Toán",
};

export default {
  ORDER_STATUS,
  NCC_PAYMENT_STATUS,
};
