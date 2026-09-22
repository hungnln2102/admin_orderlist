const { db } = require("@/db");

const SCHEMA_ORDERS = process.env.DB_SCHEMA_ORDERS || "public";
const TABLE_NAME = `${SCHEMA_ORDERS}.order_list`;

/**
 * Task rà soát & thông báo cho các đơn hàng đúng 0 ngày còn lại (Hết hạn trong ngày)
 */
async function notifyZeroDaysTask(trigger = "cron") {
  console.log(`[CRON 0H] Bắt đầu rà soát đơn hàng 0 ngày còn lại (Trigger: ${trigger})...`);

  try {
    const todaySql = "(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date";

    const result = await db.raw(`
      SELECT id, id_order, customer, contact, information_order, price, expired_at, status
      FROM ${TABLE_NAME}
      WHERE (expired_at::date - ${todaySql}) = 0
        AND status IN ('Cần gia hạn', 'CẦN GIA HẠN', 'Hết Hạn')
      ORDER BY id DESC;
    `);

    const orders = result.rows || [];
    console.log(`[CRON 0H] Tìm thấy ${orders.length} đơn hàng đúng 0 ngày còn lại.`);

    for (const order of orders) {
      console.log(` -> Đơn #${order.id_order || order.id} (${order.customer}): Cần gia hạn ngay hôm nay (Hạn: ${order.expired_at})`);
    }

    return {
      success: true,
      count: orders.length,
      orders,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[CRON 0H] Lỗi khi chạy task notifyZeroDaysTask:", err);
    throw err;
  }
}

module.exports = { notifyZeroDaysTask };
