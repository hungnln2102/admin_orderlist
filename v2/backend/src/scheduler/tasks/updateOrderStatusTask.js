const { db, TABLES } = require("@/db");

const TARGET_TABLE = TABLES.ORDER_LIST;

/**
 * Task cập nhật trạng thái đơn hàng dựa theo ngày hết hạn (expired_at)
 * - Đơn có (expired_at - hôm nay) < 0 và đang ở Đã Thanh Toán / Cần Gia Hạn -> Đổi thành "Hết Hạn"
 * - Đơn có 0 <= (expired_at - hôm nay) <= 4 và đang ở Đã Thanh Toán -> Đổi thành "Cần Gia Hạn"
 */
async function updateOrderStatusTask(trigger = "cron") {
  console.log(`[CRON 0H] Bắt đầu cập nhật trạng thái đơn hàng (Trigger: ${trigger})...`);
  
  try {
    const todaySql = "(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date";

    // 1. Chuyển đơn đã hết hạn (< 0 ngày) sang "Hết Hạn"
    const expiredResult = await db.raw(`
      UPDATE ${TARGET_TABLE}
      SET status = 'Hết Hạn'
      WHERE (expired_at::date - ${todaySql}) < 0
        AND (
          status ILIKE '%Thanh Toán%' 
          OR status ILIKE '%gia hạn%'
        )
        AND status NOT ILIKE '%Đã Hoàn%'
        AND status NOT ILIKE '%Chưa Hoàn%'
        AND status NOT ILIKE '%Hủy%'
        AND status NOT ILIKE '%Hết Hạn%'
      RETURNING id, id_order, customer, expired_at;
    `);

    const expiredCount = expiredResult.rowCount || expiredResult.rows?.length || 0;
    console.log(`[CRON 0H] Đã cập nhật ${expiredCount} đơn hết hạn (< 0 ngày) sang 'Hết Hạn'.`);

    // 2. Chuyển đơn sắp hết hạn (0 đến 4 ngày) từ "Đã Thanh Toán" sang "Cần Gia Hạn"
    const renewalResult = await db.raw(`
      UPDATE ${TARGET_TABLE}
      SET status = 'Cần Gia Hạn'
      WHERE (expired_at::date - ${todaySql}) BETWEEN 0 AND 4
        AND status ILIKE '%Thanh Toán%'
        AND status NOT ILIKE '%Đã Hoàn%'
        AND status NOT ILIKE '%Chưa Hoàn%'
        AND status NOT ILIKE '%Hủy%'
        AND status NOT ILIKE '%gia hạn%'
      RETURNING id, id_order, customer, expired_at;
    `);

    const renewalCount = renewalResult.rowCount || renewalResult.rows?.length || 0;
    console.log(`[CRON 0H] Đã cập nhật ${renewalCount} đơn (0 <= ngày còn lại <= 4) sang 'Cần Gia Hạn'.`);

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
}

module.exports = { updateOrderStatusTask };

