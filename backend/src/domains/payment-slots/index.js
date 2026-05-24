/**
 * Public API cho domain payment-slots.
 *
 * Mô hình: mỗi đơn có chuỗi `cycle_index` (1 = mua mới, 2+ = các lần gia hạn);
 * mỗi cycle = 1 slot. Slot lưu suffix định danh (1..100) cộng vào giá gốc
 * để ra `expected_amount` mà khách phải CK — webhook tra slot theo
 * (receiver_account, expected_amount) để resolve `id_order`.
 *
 * Public surface:
 *  - openPaymentSlot(executor, params)        — mở slot mới
 *  - resolveOrderByExpectedAmount(executor, params) — webhook tra order code
 *  - markPaymentSlotMatched(executor, params)  — đánh dấu sau khi receipt ghi nhận
 *  - expirePaymentSlots(executor, interval)    — cron dọn slot quá hạn
 *  - findLatestPendingSlotByOrder(executor, orderCode) — UI build QR
 *  - findLatestMatchedSlotByOrder(executor, orderCode) — runRenewal đọc giá đã chốt
 *  - SLOT_KIND, SLOT_STATUS                    — enum hằng số
 */

const constants = require("./constants");
const { openPaymentSlot } = require("./use-cases/openPaymentSlot");
const {
  resolveOrderByExpectedAmount,
} = require("./use-cases/resolveOrderByExpectedAmount");
const { markPaymentSlotMatched } = require("./use-cases/markPaymentSlotMatched");
const { expirePaymentSlots } = require("./use-cases/expirePaymentSlots");
const {
  findLatestPendingSlotByOrder,
  findLatestMatchedSlotByOrder,
  findActiveSlotByOrder,
} = require("./repositories/paymentSlotRepository");
const {
  backfillPendingPaymentSlots,
} = require("./use-cases/backfillPendingPaymentSlots");

module.exports = {
  openPaymentSlot,
  resolveOrderByExpectedAmount,
  markPaymentSlotMatched,
  expirePaymentSlots,
  backfillPendingPaymentSlots,
  findLatestPendingSlotByOrder,
  findLatestMatchedSlotByOrder,
  findActiveSlotByOrder,
  SLOT_KIND: constants.SLOT_KIND,
  SLOT_STATUS: constants.SLOT_STATUS,
  SUFFIX_MAX: constants.SUFFIX_MAX,
};
