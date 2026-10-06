/**
 * orderPaymentService.js (V2)
 * Dịch vụ xử lý Thanh Toán & Gia Hạn Đơn Hàng - Dùng chung cho:
 *   1. Luồng tự động: Webhook SePay/Ngân Hàng
 *   2. Luồng thủ công: Admin phân bổ biên lai bằng tay
 *
 * Đảm bảo: Cập nhật trạng thái đơn, cộng ngày gia hạn, phát EventBus đều đi qua 1 điểm duy nhất.
 */
const { TABLES } = require("@/db");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { eventBus, EVENTS } = require("@/events");

/**
 * Kiểm tra đơn hàng có phải đang ở trạng thái Gia Hạn (Renewal) hay không.
 * Hỗ trợ cả V1 (string tiếng Việt) và V2 (enum chuẩn).
 * @param {string} status - Trạng thái hiện tại của đơn hàng
 * @returns {boolean}
 */
function isRenewalOrder(status) {
  if (!status) return false;
  const normalized = String(status).trim().toUpperCase();
  return (
    normalized === ORDER_STATUS.RENEW_REQUIRED ||
    normalized.includes("GIA HẠN") ||
    normalized.includes("GIA HAN")
  );
}

/**
 * Tính ngày hết hạn mới khi gia hạn đơn hàng.
 * Nếu đơn chưa hết hạn (expiredAt > now), cộng thêm từ ngày hết hạn cũ.
 * Nếu đã hết hạn hoặc không có, cộng từ ngày hiện tại.
 * @param {string|Date|null} currentExpiredAt - Ngày hết hạn hiện tại
 * @param {number} daysToAdd - Số ngày cần cộng thêm
 * @returns {string} - Ngày hết hạn mới (YYYY-MM-DD)
 */
function calculateNewExpiry(currentExpiredAt, daysToAdd) {
  const now = new Date();
  let baseExpiry = now;

  if (currentExpiredAt) {
    const parsed = new Date(currentExpiredAt);
    if (!isNaN(parsed.getTime()) && parsed > now) {
      baseExpiry = parsed;
    }
  }

  const expiryDate = new Date(baseExpiry.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return expiryDate.toISOString().split("T")[0];
}

/**
 * Xử lý cập nhật Đơn hàng khi nhận thanh toán thành công.
 * Cập nhật trạng thái sang PAID, cộng ngày gia hạn (nếu có), và bắn EventBus.
 *
 * @param {import('knex').Knex.Transaction} trx - Knex transaction đang mở
 * @param {object} order - Bản ghi đơn hàng gốc từ DB (bắt buộc có id, id_order, status, days, expired_at)
 * @param {number} amount - Số tiền thanh toán
 * @param {object} options
 * @param {number} options.receiptId - ID biên lai đi kèm
 * @param {string} [options.action] - Nhãn hành động (VD: "WEBHOOK_PAYMENT_MATCH", "ADMIN_MANUAL_ALLOCATE")
 * @returns {Promise<{updatedOrder: object, isRenewal: boolean, newExpiredAt: string|null}>}
 */
async function processOrderPayment(trx, order, amount, options = {}) {
  const { receiptId, action = "PAYMENT_RECEIVED" } = options;

  const isRenewal = isRenewalOrder(order.status);
  const daysToAdd = Number(order.days || 365);

  // Xây dựng object update
  const updateFields = {
    status: ORDER_STATUS.PAID,
  };

  let newExpiredAt = null;
  if (isRenewal) {
    newExpiredAt = calculateNewExpiry(order.expired_at, daysToAdd);
    updateFields.expired_at = newExpiredAt;
  }

  // Cập nhật Đơn hàng trong transaction
  const [updatedOrder] = await trx(TABLES.ORDER_LIST)
    .where({ id: order.id })
    .update(updateFields)
    .returning("*");

  // Phát EventBus: ORDER_PAID
  eventBus.emit(EVENTS.ORDER_PAID, {
    orderId: updatedOrder.id,
    id_order: updatedOrder.id_order,
    customer: updatedOrder.customer,
    amount,
    status: updatedOrder.status,
    receiptId,
    isRenewal,
    action,
  });

  // Phát EventBus: ORDER_RENEWED (nếu là gia hạn)
  if (isRenewal) {
    eventBus.emit(EVENTS.ORDER_RENEWED, {
      orderId: updatedOrder.id,
      id_order: updatedOrder.id_order,
      customer: updatedOrder.customer,
      daysAdded: daysToAdd,
      newExpiredAt: updatedOrder.expired_at,
      receiptId,
      action,
    });
  }

  return { updatedOrder, isRenewal, newExpiredAt };
}

module.exports = {
  processOrderPayment,
  isRenewalOrder,
  calculateNewExpiry,
};
