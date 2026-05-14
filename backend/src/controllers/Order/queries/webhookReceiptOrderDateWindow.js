/**
 * Gia hạn cập nhật `order_date` = ngày bắt đầu kỳ mới (thường sau ngày nhận tiền / paid_date trên receipt).
 * Nếu chỉ lọc `paid_date >= order_date` thì khoản webhook gia hạn bị loại khỏi SUM và các đối soát tương tự.
 *
 * Cửa sổ đệm: gộp receipt có paid_date **trước** order_date nhưng trong N ngày (mặc định 5).
 * Đủ cho luồng "Cần Gia Hạn" (~4 ngày trước đầu kỳ mới); chỉnh qua env nếu cần rộng hơn.
 */
const rawGrace = Number(process.env.WEBHOOK_RECEIPT_PRE_ORDER_DATE_GRACE_DAYS);
const WEBHOOK_RECEIPT_PRE_ORDER_DATE_GRACE_DAYS =
  Number.isFinite(rawGrace) && rawGrace > 0
    ? Math.min(365, Math.floor(rawGrace))
    : 5;

module.exports = {
  WEBHOOK_RECEIPT_PRE_ORDER_DATE_GRACE_DAYS,
};
