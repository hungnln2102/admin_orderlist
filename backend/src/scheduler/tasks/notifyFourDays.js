const logger = require("../../utils/logger");
const { sendFourDaysRemainingNotification } = require("../../services/telegramOrderNotification");
const { todayYMDInVietnam } = require("../../utils/normalizers");
const { computeOrderCurrentPrice } = require("../../../webhook/sepay/renewal");
const { fetchVariantDisplayNames } = require("../variantDisplayNames");
const { ORDER_PREFIXES } = require("../../utils/orderHelpers");
const { buildRenewalQuery, normalizeNotifyRow } = require("./shared");
const {
  claimDailyNotificationRun,
  releaseDailyNotificationRun,
} = require("./shared/dailyNotificationGuard");

const ADVISORY_LOCK_KEY_1 = 90101;
const ADVISORY_LOCK_KEY_2 = 4;

function createNotifyFourDaysTask(pool, getSqlCurrentDate) {
  return async function notifyFourDaysRemainingTask(trigger = "cron") {
    const sqlDate = getSqlCurrentDate();
    const dateYmd = todayYMDInVietnam();
    logger.info(
      `[CRON] Bắt đầu thông báo các đơn cần gia hạn (còn 4 ngày)`,
      {
        trigger,
        pid: process.pid,
        date: process.env.MOCK_DATE || "CURRENT_DATE",
        dateYmd,
      }
    );

    if (process.env.MOCK_DATE) {
      logger.warn(`[TEST MODE] Đang sử dụng ngày giả định: ${process.env.MOCK_DATE}`);
    }

    const client = await pool.connect();
    let hasLock = false;
    let dailyGuardKey = null;
    try {
      const lockResult = await client.query(
        "SELECT pg_try_advisory_lock($1, $2) AS locked",
        [ADVISORY_LOCK_KEY_1, ADVISORY_LOCK_KEY_2]
      );
      hasLock = lockResult.rows?.[0]?.locked === true;
      if (!hasLock) {
        logger.warn(
          "[CRON] notifyFourDays task đang chạy ở process khác — bỏ qua lần gọi trùng",
          { trigger, pid: process.pid }
        );
        return;
      }

      const dailyGuard = await claimDailyNotificationRun(client, {
        notificationCode: "notify-four-days",
        dateYmd,
        trigger,
      });
      dailyGuardKey = dailyGuard.key;
      if (!dailyGuard.claimed) {
        logger.warn(
          "[CRON] notifyFourDays đã gửi trong ngày — bỏ qua lần gọi trùng",
          { trigger, pid: process.pid, dateYmd, dailyGuardKey }
        );
        return;
      }

      // Chỉ check đúng điều kiện: số ngày còn lại = 4 VÀ status = Cần Gia Hạn.
      const result = await client.query(buildRenewalQuery(sqlDate, 4));

      const giftPrefix = String(ORDER_PREFIXES.gift || "MAVT")
        .trim()
        .toUpperCase();
      const notifyRows = result.rows.filter((row) => {
        const code = String(row.id_order || row.idOrder || "")
          .trim()
          .toUpperCase();
        return !(giftPrefix && code.startsWith(giftPrefix));
      });
      const skippedGiftCount = result.rows.length - notifyRows.length;

      logger.info(
        `Tìm thấy ${result.rowCount} đơn cần gia hạn (còn 4 ngày), gửi ${notifyRows.length} đơn`,
        { skippedGiftCount, giftPrefix }
      );

      if (notifyRows.length > 0) {
        const today = todayYMDInVietnam();
        const variantIds = notifyRows.map((r) => r.id_product).filter((id) => id != null);
        const nameMap = await fetchVariantDisplayNames(client, variantIds);
        const normalizedOrders = [];
        for (const row of notifyRows) {
          const computed = await computeOrderCurrentPrice(client, row);
          normalizedOrders.push(normalizeNotifyRow(row, today, nameMap, computed));
        }

        await sendFourDaysRemainingNotification(normalizedOrders);
      } else {
        logger.info(
          "[CRON] Không có đơn nào cần gia hạn để gửi thông báo (còn 4 ngày, bỏ qua MAVT)"
        );
      }
    } catch (err) {
      logger.error("[CRON] Lỗi khi thông báo đơn cần gia hạn (còn 4 ngày)", {
        error: err.message,
        stack: err.stack,
      });
      await releaseDailyNotificationRun(client, dailyGuardKey);
      throw err;
    } finally {
      if (hasLock) {
        await client
          .query("SELECT pg_advisory_unlock($1, $2)", [
            ADVISORY_LOCK_KEY_1,
            ADVISORY_LOCK_KEY_2,
          ])
          .catch((unlockErr) =>
            logger.warn("[CRON] Không thể unlock advisory lock notifyFourDays", {
              error: unlockErr.message,
              pid: process.pid,
            })
          );
      }
      client.release();
    }
  };
}

module.exports = { createNotifyFourDaysTask };
