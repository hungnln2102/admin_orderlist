const { db } = require("@/db");

const SCHEMA_ORDERS = process.env.DB_SCHEMA_ORDERS || "public";
const TABLE_NAME = `${SCHEMA_ORDERS}.order_list`;

/**
 * Task rà soát & thông báo cho các đơn hàng còn đúng 4 ngày sử dụng (Nhắc nhở gia hạn lúc 7h sáng)
 */
async function notifyFourDaysTask(trigger = "cron") {
  console.log(`[CRON 7H] Bắt đầu rà soát đơn hàng 4 ngày còn lại (Trigger: ${trigger})...`);

  try {
    const todaySql = "(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date";

    const result = await db.raw(`
      SELECT id, id_order, customer, contact, information_order, price, expired_at, status
      FROM ${TABLE_NAME}
      WHERE (expired_at::date - ${todaySql}) = 4
        AND status IN ('Cần gia hạn', 'CẦN GIA HẠN', 'Đã Thanh Toán', 'Hoàn thành')
      ORDER BY id DESC;
    `);

    const orders = result.rows || [];
    console.log(`[CRON 7H] Tìm thấy ${orders.length} đơn hàng còn đúng 4 ngày sử dụng.`);

    for (const order of orders) {
      console.log(` -> Đơn #${order.id_order || order.id} (${order.customer}): Còn 4 ngày nữa hết hạn (Hạn: ${order.expired_at})`);
    }

    return {
      success: true,
      count: orders.length,
      orders,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[CRON 7H] Lỗi khi chạy task notifyFourDaysTask:", err);
    throw err;
  }
}

module.exports = { notifyFourDaysTask };
