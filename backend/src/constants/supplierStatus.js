/**
 * supplierStatus.js (V2)
 * Bộ hằng số chuẩn hóa cho Nhà Cung Cấp
 */

const SUPPLIER_PAYMENT_STATUS = {
  UNPAID: 'Chưa Thanh Toán',
  PAID: 'Đã Thanh Toán',
  CANCELED: 'Đã Hủy',
  CANCEL: 'Hủy' // Một số bản ghi cũ có thể dùng chữ 'Hủy' thay vì 'Đã Hủy'
};

module.exports = {
  SUPPLIER_PAYMENT_STATUS,
};
