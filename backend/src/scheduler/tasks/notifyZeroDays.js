const logger = require("../../utils/logger");
const { sendZeroDaysRemainingNotification } = require("../../services/telegramOrderNotification");
const { todayYMDInVietnam } = require("../../utils/normalizers");
const { fetchVariantDisplayNames } = require("../variantDisplayNames");
const { buildRenewalQuery, normalizeNotifyRow } = require("./shared");

function createNotifyZeroDaysTask(pool, getSqlCurrentDate) {
  return async function notifyZeroDaysRemainingTask(trigger = "cron") {
    const sqlDate = getSqlCurrentDate();
    logger.info(
      `[CRON] Bắt đầu thông báo các đơn đúng ngày hết hạn (số ngày còn lại = 0, Cần Gia Hạn)`,
      { trigger, date: process.env.MOCK_DATE || "CURRENT_DATE" }
    );

    if (process.env.MOCK_DATE) {
      logger.warn(`[TEST MODE] Đang sử dụng ngày giả định: ${process.env.MOCK_DATE}`);
    }

    const client = await pool.connect();
    try {
      // Chỉ check đúng điều kiện: số ngày còn lại = 0 VÀ status = Cần Gia Hạn.
      const result = await client.query(buildRenewalQuery(sqlDate, 0));

      logger.info(
        `Tìm thấy ${result.rowCount} đơn đúng ngày hết hạn (0 ngày còn lại, trạng thái = Cần Gia Hạn)`
      );

      if (result.rows.length > 0) {
        const today = todayYMDInVietnam();
        const variantIds = result.rows.map((r) => r.id_product).filter((id) => id != null);
        const nameMap = await fetchVariantDisplayNames(client, variantIds);
        const normalizedOrders = result.rows.map((row) =>
          normalizeNotifyRow(row, today, nameMap, undefined)
        );

        await sendZeroDaysRemainingNotification(normalizedOrders);
      } else {
        logger.info(
          "[CRON] Không có đơn nào cần thông báo (ngày còn lại = 0, trạng thái = Cần Gia Hạn)"
        );
      }
    } catch (err) {
      logger.error("[CRON] Lỗi khi thông báo đơn hết hạn", {
        error: err.message,
        stack: err.stack,
      });
      throw err;
    } finally {
      client.release();
    }
  };
}

module.exports = { createNotifyZeroDaysTask };
