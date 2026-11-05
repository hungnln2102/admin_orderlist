const { db, TABLES } = require("@/db");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const systemConfigService = require("@/domains/system/services/systemConfigService");
const { syncRenewRequiredOrdersPricing } = require("@/domains/products/services/catalogPricingService");
const { withAdvisoryLock } = require("../withAdvisoryLock");
const { notifyFourDaysRemaining } = require("@/domains/notifications/telegram/dispatchers/orderNotifier");

const TARGET_TABLE = TABLES.ORDER_LIST;

/**
 * Task rà soát & thông báo cho các đơn hàng còn đúng N ngày sử dụng (Nhắc nhở gia hạn lúc 7h sáng)
 * Chỉ thông báo duy nhất tại mốc warnDays (mặc định đúng 4 ngày) theo chỉ đạo của Master.
 */
async function notifyFourDaysTask(trigger = "cron") {
  return withAdvisoryLock("notify_four_days", async () => {
    const warnDays = systemConfigService.getInteger("RENEWAL_WARN_DAYS", 4, 0, 365);
    console.log(`[CRON 7H] Bắt đầu rà soát đơn hàng còn đúng ${warnDays} ngày hết hạn (Trigger: ${trigger})...`);

    try {
      const pricingSync = await syncRenewRequiredOrdersPricing();
      console.log(`[CRON 7H] Đồng bộ ${pricingSync.updatedCount} đơn cần gia hạn theo bảng giá Catalog mới nhất.`);
      const todaySql = "(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date";

      // Chỉ quét các đơn còn đúng warnDays ngày (mặc định đúng 4 ngày)
      const result = await db.raw(`
        SELECT *, (expired_at::date - ${todaySql}) AS days_left
        FROM ${TARGET_TABLE}
        WHERE (expired_at::date - ${todaySql}) = ?
          AND status IN (?, ?)
        ORDER BY id DESC;
      `, [warnDays, ORDER_STATUS.PAID, ORDER_STATUS.RENEW_REQUIRED]);

      const orders = result.rows || [];
      console.log(`[CRON 7H] Tìm thấy ${orders.length} đơn hàng còn đúng ${warnDays} ngày hết hạn.`);

      for (const order of orders) {
        console.log(` -> Đơn #${order.id_order || order.id} (${order.customer}): Còn ${order.days_left} ngày (Hạn: ${order.expired_at})`);
      }

      if (orders.length > 0) {
        await notifyFourDaysRemaining(orders, warnDays);
      }

      return {
        success: true,
        count: orders.length,
        pricingUpdatedCount: pricingSync.updatedCount,
        orders,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.error("[CRON 7H] Lỗi khi chạy task notifyFourDaysTask:", err);
      throw err;
    }
  });
}

module.exports = { notifyFourDaysTask };
