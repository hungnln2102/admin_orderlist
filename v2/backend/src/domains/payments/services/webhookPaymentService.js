const { db } = require("@/db");
const { eventBus, EVENTS } = require("@/events");

const SCHEMA_ORDERS = process.env.DB_SCHEMA_ORDERS || process.env.SCHEMA_ORDERS || "orders";
const getOrderTable = () => db.withSchema(SCHEMA_ORDERS).from("order_list");

/**
 * Xử lý Webhook SePay / Ngân Hàng tự động khớp đơn hàng theo số tiền (Giá + Suffix 1..100)
 */
async function processPaymentWebhook(payload = {}) {
  const rawAmount = payload.transferAmount ?? payload.amount ?? payload.accumulatedAmount ?? payload.price ?? 0;
  const transferAmount = Math.round(Number(rawAmount));

  if (!transferAmount || transferAmount <= 0) {
    return {
      success: false,
      matched: false,
      reason: "Số tiền chuyển khoản không hợp lệ (<= 0)",
    };
  }

  // 1. Tìm đơn hàng ở trạng thái Chưa Thanh Toán hoặc Cần gia hạn có giá khớp chính xác với transferAmount
  const matchedOrder = await getOrderTable()
    .where((builder) => {
      builder.where("price", transferAmount).orWhere("gross_selling_price", transferAmount);
    })
    .where((builder) => {
      builder
        .whereILike("status", "%Chưa Thanh Toán%")
        .orWhereILike("status", "%Cần gia hạn%")
        .orWhereILike("status", "%Chờ xử lý%");
    })
    .orderBy("id", "desc")
    .first();

  if (!matchedOrder) {
    console.log(`ℹ️ [Webhook] Không tìm thấy đơn hàng đang chờ khớp với số tiền: ${new Intl.NumberFormat("vi-VN").format(transferAmount)} ₫`);
    return {
      success: true,
      matched: false,
      amount: transferAmount,
      reason: `Không tìm thấy đơn hàng đang chờ với số tiền ${transferAmount} ₫`,
    };
  }

  const isRenewal = String(matchedOrder.status).toLowerCase().includes("gia hạn");
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  let newExpiredAt = matchedOrder.expired_at;
  const daysToAdd = Number(matchedOrder.days || 365);

  if (isRenewal) {
    // Nếu là gia hạn, cộng thêm số ngày vào ngày hết hạn hiện tại (hoặc từ hôm nay nếu đã hết hạn lâu)
    let baseExpiry = now;
    if (matchedOrder.expired_at) {
      const parsed = new Date(matchedOrder.expired_at);
      if (!isNaN(parsed.getTime()) && parsed > now) {
        baseExpiry = parsed;
      }
    }
    const expiryDate = new Date(baseExpiry.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    newExpiredAt = expiryDate.toISOString().split("T")[0];
  }

  // 2. Cập nhật trạng thái đơn hàng sang "Đã Thanh Toán"
  const updateFields = {
    status: "Đã Thanh Toán",
  };
  if (isRenewal && newExpiredAt) {
    updateFields.expired_at = newExpiredAt;
  }

  const [updatedOrder] = await getOrderTable()
    .where({ id: matchedOrder.id })
    .update(updateFields)
    .returning("*");

  const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
  console.log(`✅ [Webhook] Khớp tự động thành công đơn #${updatedOrder.id_order} - Số tiền: ${formatMoney(transferAmount)}`);

  // 3. Bắn sự kiện Domain sang EventBus
  eventBus.emit(EVENTS.ORDER_PAID, {
    orderId: updatedOrder.id,
    id_order: updatedOrder.id_order,
    customer: updatedOrder.customer,
    amount: transferAmount,
    status: updatedOrder.status,
    isRenewal,
    action: "WEBHOOK_PAYMENT_MATCH",
  });

  if (isRenewal) {
    eventBus.emit(EVENTS.ORDER_RENEWED, {
      orderId: updatedOrder.id,
      id_order: updatedOrder.id_order,
      customer: updatedOrder.customer,
      daysAdded: daysToAdd,
      newExpiredAt: updatedOrder.expired_at,
      action: "RENEWAL_COMPLETED",
    });
  }

  return {
    success: true,
    matched: true,
    orderId: updatedOrder.id,
    id_order: updatedOrder.id_order,
    customer: updatedOrder.customer,
    amount: transferAmount,
    previousStatus: matchedOrder.status,
    newStatus: updatedOrder.status,
    isRenewal,
  };
}

module.exports = {
  processPaymentWebhook,
};
