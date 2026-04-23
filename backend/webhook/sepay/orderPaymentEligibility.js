const { STATUS } = require("../../src/utils/statuses");

const PAYABLE_STATUSES = new Set([STATUS.UNPAID, STATUS.RENEWAL]);

const LOCKED_STATUS_META = new Map([
  [
    STATUS.PAID,
    {
      auditBranch: "QR_ALREADY_CONSUMED_SKIP",
      reason: "Đơn đã thanh toán, QR không còn hiệu lực.",
    },
  ],
  [
    STATUS.PROCESSING,
    {
      auditBranch: "QR_ALREADY_CONSUMED_SKIP",
      reason: "Đơn đang xử lý, QR không còn hiệu lực.",
    },
  ],
  [
    STATUS.EXPIRED,
    {
      auditBranch: "QR_EXPIRED_SKIP",
      reason: "Đơn đã hết hạn, QR không còn hiệu lực.",
    },
  ],
  [
    STATUS.CANCELED,
    {
      auditBranch: "QR_CANCELED_SKIP",
      reason: "Đơn đã hủy, QR không còn hiệu lực.",
    },
  ],
  [
    STATUS.REFUNDED,
    {
      auditBranch: "QR_REFUNDED_SKIP",
      reason: "Đơn đã hoàn, QR không còn hiệu lực.",
    },
  ],
  [
    STATUS.PENDING_REFUND,
    {
      auditBranch: "QR_PENDING_REFUND_SKIP",
      reason: "Đơn đang chờ hoàn, QR không còn hiệu lực.",
    },
  ],
]);

const normalizeStatus = (value) => String(value || "").trim();

const getOrderQrPaymentEligibility = (statusValue) => {
  const normalizedStatus = normalizeStatus(statusValue);
  if (PAYABLE_STATUSES.has(normalizedStatus)) {
    return {
      canPayByQr: true,
      auditBranch: "QR_PAYABLE",
      reason: "",
    };
  }

  const lockedMeta = LOCKED_STATUS_META.get(normalizedStatus);
  if (lockedMeta) {
    return {
      canPayByQr: false,
      auditBranch: lockedMeta.auditBranch,
      reason: lockedMeta.reason,
    };
  }

  return {
    canPayByQr: false,
    auditBranch: "QR_STATUS_NOT_SUPPORTED_SKIP",
    reason: `Trạng thái "${normalizedStatus || "unknown"}" không hỗ trợ thanh toán QR.`,
  };
};

module.exports = {
  getOrderQrPaymentEligibility,
};
