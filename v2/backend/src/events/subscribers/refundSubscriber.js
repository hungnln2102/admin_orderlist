const { db } = require("@/db");
const eventBus = require("../eventBus");
const EVENTS = require("../eventTypes");

/**
 * Đăng ký Subscriber lắng nghe các sự kiện về Hoàn Tiền (Refund Credit)
 */
function registerRefundEventSubscribers() {
  // Lắng nghe sự kiện Hủy đơn & Hoàn tiền (Soft Delete)
  eventBus.on(EVENTS.ORDER_CANCELED_REFUNDED, async (data) => {
    try {
      const { order, refundAmount, orderId, orderCode, canceledAt } = data;
      
      if (!refundAmount || refundAmount <= 0) {
        return; // Không có tiền hoàn thì không tạo credit note
      }

      const safeOrderId = orderId || order?.id;
      const safeOrderCode = orderCode || order?.id_order || "ORDER";
      const creditCode = `RFC-${safeOrderCode}-${safeOrderId}`;

      const payload = {
        credit_code: creditCode,
        source_order_list_id: safeOrderId,
        source_order_code: safeOrderCode,
        customer_name: order?.customer || "Khách hàng",
        customer_contact: order?.contact || "",
        refund_amount: refundAmount,
        available_amount: refundAmount,
        status: "OPEN", // Theo v1 là OPEN
        note: `Tự động tạo credit khi hủy đơn #${safeOrderCode} vào ngày ${canceledAt}`,
        source_kind: "ORDER_REFUND",
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      };

      // Ghi nhận vào bảng billing.refund_credit_notes
      const [inserted] = await db("billing.refund_credit_notes")
        .insert(payload)
        .returning("*");

      console.log(`💳 [RefundSubscriber] Đã tạo Refund Credit Note ${refundAmount} ₫ (Mã: ${creditCode}) cho đơn #${safeOrderCode}`);
    } catch (err) {
      console.error("❌ [RefundSubscriber] Lỗi tạo Refund Credit Note:", err);
    }
  });
}

module.exports = {
  registerRefundEventSubscribers,
};
