const { db, TABLES } = require("@/db");

const TARGET_TABLE = TABLES.ORDER_LIST;

/**
 * Task rà soát & thông báo cho các đơn hàng còn đúng 4 ngày sử dụng (Nhắc nhở gia hạn lúc 7h sáng)
 */
async function notifyFourDaysTask(trigger = "cron") {
  console.log(`[CRON 7H] Bắt đầu rà soát đơn hàng 4 ngày còn lại (Trigger: ${trigger})...`);

  try {
    const todaySql = "(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date";

    const result = await db.raw(`
      SELECT id, id_order, customer, contact, information_order, price, expired_at, status
      FROM ${TARGET_TABLE}
      WHERE (expired_at::date - ${todaySql}) = 4
        AND (status ILIKE '%gia hạn%' OR status ILIKE '%Thanh Toán%')
        AND status NOT ILIKE '%Đã Hoàn%'
        AND status NOT ILIKE '%Chưa Hoàn%'
        AND status NOT ILIKE '%Hủy%'
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

