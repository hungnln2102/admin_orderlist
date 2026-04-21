const logger = require("../../utils/logger");
const { sendZeroDaysRemainingNotification } = require("../../services/telegramOrderNotification");
const { todayYMDInVietnam } = require("../../utils/normalizers");
const { fetchVariantDisplayNames } = require("../variantDisplayNames");
const { buildRenewalQuery, normalizeNotifyRow } = require("./shared");

const ADVISORY_LOCK_KEY_1 = 90101;
const ADVISORY_LOCK_KEY_2 = 0;

function createNotifyZeroDaysTask(pool, getSqlCurrentDate) {
  return async function notifyZeroDaysRemainingTask(trigger = "cron") {
    const sqlDate = getSqlCurrentDate();
    logger.info(
      `[CRON] Bắt đầu thông báo các đơn đúng ngày hết hạn (số ngày còn lại = 0, Cần Gia Hạn)`,
      { trigger, pid: process.pid, date: process.env.MOCK_DATE || "CURRENT_DATE" }
    );

    if (process.env.MOCK_DATE) {
      logger.warn(`[TEST MODE] Đang sử dụng ngày giả định: ${process.env.MOCK_DATE}`);
    }

    const client = await pool.connect();
    let hasLock = false;
    try {
      const lockResult = await client.query(
        "SELECT pg_try_advisory_lock($1, $2) AS locked",
        [ADVISORY_LOCK_KEY_1, ADVISORY_LOCK_KEY_2]
      );
      hasLock = lockResult.rows?.[0]?.locked === true;
      if (!hasLock) {
        logger.warn(
          "[CRON] notifyZeroDays task đang chạy ở process khác — bỏ qua lần gọi trùng",
          { trigger, pid: process.pid }
        );
        return;
      }

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
      if (hasLock) {
        await client
          .query("SELECT pg_advisory_unlock($1, $2)", [
            ADVISORY_LOCK_KEY_1,
            ADVISORY_LOCK_KEY_2,
          ])
          .catch((unlockErr) =>
            logger.warn("[CRON] Không thể unlock advisory lock notifyZeroDays", {
              error: unlockErr.message,
              pid: process.pid,
            })
          );
      }
      client.release();
    }
  };
}

module.exports = { createNotifyZeroDaysTask };
