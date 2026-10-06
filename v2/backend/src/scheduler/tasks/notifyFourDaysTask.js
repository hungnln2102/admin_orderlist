const { db, TABLES } = require("@/db");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const systemConfigService = require("@/domains/system/services/systemConfigService");

const TARGET_TABLE = TABLES.ORDER_LIST;

/**
 * Task rà soát & thông báo cho các đơn hàng còn N ngày sử dụng (Nhắc nhở gia hạn lúc 7h sáng)
 */
async function notifyFourDaysTask(trigger = "cron") {
  const warnDays = systemConfigService.get("RENEWAL_WARN_DAYS", 4);
  console.log(`[CRON 7H] Bắt đầu rà soát đơn hàng còn ${warnDays} ngày sử dụng (Trigger: ${trigger})...`);

  try {
    const todaySql = "(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date";

    const result = await db.raw(`
      SELECT id, id_order, customer, contact, information_order, price, expired_at, status
      FROM ${TARGET_TABLE}
      WHERE (expired_at::date - ${todaySql}) = ${warnDays}
        AND status IN ('${ORDER_STATUS.PAID}', '${ORDER_STATUS.RENEW_REQUIRED}')
      ORDER BY id DESC;
    `);

    const orders = result.rows || [];
    console.log(`[CRON 7H] Tìm thấy ${orders.length} đơn hàng còn đúng ${warnDays} ngày sử dụng.`);

    for (const order of orders) {
      console.log(` -> Đơn #${order.id_order || order.id} (${order.customer}): Còn ${warnDays} ngày nữa hết hạn (Hạn: ${order.expired_at})`);
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

