/**
 * receiptStatus.js (V2)
 * Bộ hằng số chuẩn hóa cho Biên lai (Receipt) - KHÔNG HARDCODE string trực tiếp trong code.
 * Mọi thay đổi trạng thái, loại phân bổ hay loại giao dịch chỉ chỉnh sửa tại file này.
 */

/**
 * Trạng thái của Biên lai thanh toán
 */
const RECEIPT_STATUS = Object.freeze({
  UNALLOCATED: "UNALLOCATED",               // Chưa phân bổ (mặc định khi tạo mới)
  PARTIALLY_ALLOCATED: "PARTIALLY_ALLOCATED", // Phân bổ một phần
  FULLY_ALLOCATED: "FULLY_ALLOCATED",        // Phân bổ toàn bộ
});

/**
 * Loại phân bổ (Allocation Type) - Biên lai được gán cho loại nghiệp vụ nào
 */
const ALLOCATION_TYPE = Object.freeze({
  ORDER: "ORDER",       // Gán vào Đơn hàng
  SUPPLIER: "SUPPLIER", // Gán vào thanh toán NCC
  EXPENSE: "EXPENSE",   // Gán vào chi phí vận hành
  CREDIT: "CREDIT",     // Gán vào ví credit hoàn tiền
  OTHER: "OTHER",       // Khác
});

/**
 * Loại chuyển khoản của Biên lai
 */
const TRANSFER_TYPE = Object.freeze({
  IN: "in",   // Tiền vào
  OUT: "out", // Tiền ra
});

/**
 * Người tạo phân bổ (Created By) - Phân biệt tự động hay thủ công
 */
const ALLOCATION_CREATOR = Object.freeze({
  SYSTEM_WEBHOOK: "SYSTEM_WEBHOOK", // Tự động khớp từ Webhook
  ADMIN: "ADMIN",                   // Admin phân bổ thủ công
});

module.exports = {
  RECEIPT_STATUS,
  ALLOCATION_TYPE,
  TRANSFER_TYPE,
  ALLOCATION_CREATOR,
};
