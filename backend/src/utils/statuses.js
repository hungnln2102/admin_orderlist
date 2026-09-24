const fs = require("fs");
const path = require("path");

const resolveSharedStatuses = () => {
  const candidates = [
    path.resolve(__dirname, "../../../shared/orderStatuses.cjs"),
    path.resolve(__dirname, "../../shared/orderStatuses.cjs"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return require(candidate);
    }
  }

  return null;
};

const FALLBACK_STATUSES = {
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
 */
const FALLBACK_NCC_PAYMENT_STATUS = {
  UNPAID: "Chưa Thanh Toán",
  PAID: "Đã Thanh Toán",
};

const shared = resolveSharedStatuses();
const ORDER_STATUS = (shared && shared.ORDER_STATUS) || FALLBACK_STATUSES;
const NCC_PAYMENT_STATUS = (shared && shared.NCC_PAYMENT_STATUS) || FALLBACK_NCC_PAYMENT_STATUS;

const STATUS = ORDER_STATUS;

module.exports = {
  STATUS,
  NCC_PAYMENT_STATUS,
};
