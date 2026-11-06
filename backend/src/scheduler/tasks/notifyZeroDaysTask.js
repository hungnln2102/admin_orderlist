const { db, TABLES } = require("@/db");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const systemConfigService = require("@/domains/system/services/systemConfigService");
const { withAdvisoryLock } = require("../withAdvisoryLock");
const { notifyZeroDaysRemaining } = require("@/domains/notifications/telegram/dispatchers/orderNotifier");

const TARGET_TABLE = TABLES.ORDER_LIST;

/**
 * Task rà soát & thông báo cho các đơn hàng đúng 0 ngày còn lại (Hết hạn trong ngày)
 */
async function notifyZeroDaysTask(trigger = "cron") {
  return withAdvisoryLock("notify_zero_days", async () => {
    const isEnabled = systemConfigService.get("ZERO_DAYS_NOTIFICATION_ENABLED", true);
    if (isEnabled === false || String(isEnabled).toLowerCase() === "false") {
      console.log(`[CRON 0-DAYS] Thông báo đơn 0 ngày đang TẮT (ZERO_DAYS_NOTIFICATION_ENABLED=false). Bỏ qua lượt chạy.`);
      return {
        success: true,
        count: 0,
        orders: [],
        skipped: true,
        message: "Thông báo đơn 0 ngày đang tắt trong cấu hình hệ thống.",
        timestamp: new Date().toISOString(),
      };
    }

    console.log(`[CRON 0-DAYS] Bắt đầu rà soát đơn hàng 0 ngày còn lại (Trigger: ${trigger})...`);

    try {
      const todaySql = "(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date";

      const result = await db.raw(`
        SELECT *, (expired_at::date - ${todaySql}) AS days_left
        FROM ${TARGET_TABLE}
        WHERE (expired_at::date - ${todaySql}) = 0
          AND status = ?
        ORDER BY id DESC;
      `, [ORDER_STATUS.RENEW_REQUIRED]);

      const orders = result.rows || [];
      console.log(`[CRON 0-DAYS] Tìm thấy ${orders.length} đơn hàng đúng 0 ngày còn lại.`);

      for (const order of orders) {
        console.log(` -> Đơn #${order.id_order || order.id} (${order.customer}): Cần gia hạn ngay hôm nay (Hạn: ${order.expired_at})`);
      }

      if (orders.length > 0) {
        await notifyZeroDaysRemaining(orders);
      }

      return {
        success: true,
        count: orders.length,
        orders,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.error("[CRON 0-DAYS] Lỗi khi chạy task notifyZeroDaysTask:", err);
      throw err;
    }
  });
}

module.exports = { notifyZeroDaysTask };
