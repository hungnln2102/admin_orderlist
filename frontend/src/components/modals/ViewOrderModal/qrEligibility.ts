import { ORDER_STATUS } from "@shared/orderStatuses";

type QrEligibility = {
  canUseQr: boolean;
  reason: string;
};

const PAYABLE_STATUSES = new Set([ORDER_STATUS.UNPAID, ORDER_STATUS.RENEWAL]);

export const getOrderQrEligibility = (statusValue: unknown): QrEligibility => {
  const status = String(statusValue || "").trim();
  if (PAYABLE_STATUSES.has(status)) {
    return {
      canUseQr: true,
      reason: "",
    };
  }

  if (status === ORDER_STATUS.PAID || status === ORDER_STATUS.PROCESSING) {
    return {
      canUseQr: false,
      reason: "QR này đã được sử dụng hoặc đơn đang xử lý thanh toán.",
    };
  }

  if (status === ORDER_STATUS.CANCELED) {
    return {
      canUseQr: false,
      reason: "Đơn đã hủy nên QR không còn hiệu lực.",
    };
  }

  if (status === ORDER_STATUS.EXPIRED) {
    return {
      canUseQr: false,
      reason: "Đơn đã hết hạn nên QR không còn hiệu lực.",
    };
  }

  if (status === ORDER_STATUS.REFUNDED || status === ORDER_STATUS.PENDING_REFUND) {
    return {
      canUseQr: false,
      reason: "Đơn đang trong luồng hoàn tiền nên QR đã bị khóa.",
    };
  }

  return {
    canUseQr: false,
    reason: "Trạng thái đơn không cho phép thanh toán bằng QR.",
  };
};
