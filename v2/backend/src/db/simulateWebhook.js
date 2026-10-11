/**
 * simulateWebhook.js
 * Script giả lập SePay Webhook cho một mã đơn hàng cụ thể.
 */

require("module-alias/register");
const { db, TABLES } = require("./index");
const { processPaymentWebhook } = require("../domains/payments/services/webhookPaymentService");

async function simulate() {
  const orderCode = "MAVCC3HXDE";
  const order = await db(TABLES.ORDER_LIST).where("id_order", orderCode).first();
  if (!order) {
    console.error(`❌ Không tìm thấy đơn hàng ${orderCode}`);
    process.exit(1);
  }

  const amount = Number(order.gross_selling_price || order.price || 0);
  console.log(`📦 Tìm thấy đơn ${orderCode}, giá trị cần thanh toán: ${amount} ₫`);

  const payload = {
    id: Date.now(),
    gateway: "MBBank",
    transactionDate: new Date().toISOString(),
    accountNumber: "0378304963",
    transferType: "in",
    transferAmount: amount,
    accumulatedAmount: amount,
    content: `Thanh toan don hang ${orderCode}`,
    referenceCode: `REF_${Date.now()}`,
  };

  console.log("🚀 Đang giả lập SePay webhook payload:", payload);
  const result = await processPaymentWebhook(payload);
  console.log("✅ Kết quả xử lý webhook:", result);
  process.exit(0);
}

simulate().catch((err) => {
  console.error("❌ Lỗi giả lập webhook:", err);
  process.exit(1);
});
