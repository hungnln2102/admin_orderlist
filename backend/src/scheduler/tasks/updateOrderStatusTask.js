const { TABLES } = require("@/db");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const systemConfigService = require("@/domains/system/services/systemConfigService");
const { withAdvisoryLock } = require("../withAdvisoryLock");

const TARGET_TABLE = TABLES.ORDER_LIST;

/**
 * Task cập nhật trạng thái đơn hàng dựa theo ngày hết hạn (expired_at)
 * - Đơn có (expired_at - hôm nay) < 0 và đang ở PAID / RENEW_REQUIRED -> Đổi thành EXPIRED (GIỮ NGUYÊN GIÁ)
 * - Đơn có 0 <= (expired_at - hôm nay) <= warnDays và đang ở PAID -> Đổi thành RENEW_REQUIRED (LẤY GIÁ CATALOG + CẤP SLOT SUFFIX)
 * - Đồng bộ lại giá theo Catalog mới nhất cho toàn bộ đơn đang ở RENEW_REQUIRED (Cố định slot suffix)
 * - TUYỆT ĐỐI GIỮ NGUYÊN GIÁ CHO ĐƠN ĐÃ THANH TOÁN (PAID) VÀ ĐÃ HẾT HẠN (EXPIRED)
 */
async function updateOrderStatusTask(trigger = "cron") {
  return withAdvisoryLock("update_order_status", async (trx) => {
    const warnDays = systemConfigService.getInteger("RENEWAL_WARN_DAYS", 4, 0, 365);
    console.log(`[CRON 0H] Bắt đầu cập nhật trạng thái đơn hàng (Trigger: ${trigger}, warnDays: ${warnDays})...`);

    try {
      const todaySql = "(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date";

      // 1. Chuyển đơn đã hết hạn (< 0 ngày) sang EXPIRED (BẮT BUỘC GIỮ NGUYÊN GIÁ)
      const expiredResult = await trx.raw(`
        UPDATE ${TARGET_TABLE}
        SET status = ?
        WHERE (expired_at::date - ${todaySql}) < 0
          AND status IN (?, ?, ?, ?)
        RETURNING id, id_order, customer, expired_at;
      `, [ORDER_STATUS.EXPIRED, ORDER_STATUS.PAID, ORDER_STATUS.RENEW_REQUIRED, 'Đã Thanh Toán', 'Cần Gia Hạn']);

      const expiredCount = expiredResult.rowCount || expiredResult.rows?.length || 0;
      console.log(`[CRON 0H] Đã cập nhật ${expiredCount} đơn hết hạn (< 0 ngày) sang '${ORDER_STATUS.EXPIRED}' (Giữ nguyên giá lịch sử).`);

      // 2. Chuyển đơn sắp hết hạn (0 đến warnDays ngày) sang RENEW_REQUIRED
      const renewalResult = await trx.raw(`
        UPDATE ${TARGET_TABLE}
        SET status = ?
        WHERE (expired_at::date - ${todaySql}) BETWEEN 0 AND ?
          AND status IN (?, ?)
        RETURNING id, id_order, id_product, information_order, customer, expired_at, price, gross_selling_price;
      `, [ORDER_STATUS.RENEW_REQUIRED, warnDays, ORDER_STATUS.PAID, 'Đã Thanh Toán']);

      const renewalCount = renewalResult.rowCount || renewalResult.rows?.length || 0;
      console.log(`[CRON 0H] Renewal transition completed for ${renewalCount} orders.`);

      return {
        success: true,
        expiredCount,
        renewalCount,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.error("[CRON 0H] Lỗi khi cập nhật trạng thái đơn hàng:", err);
      throw err;
    }
  });
}

module.exports = { updateOrderStatusTask };
