const logger = require("../../utils/logger");
const { sendZeroDaysRemainingNotification } = require("../../services/telegramOrderNotification");
const { todayYMDInVietnam } = require("../../utils/normalizers");
const { fetchVariantDisplayNames } = require("../variantDisplayNames");
const { buildRenewalQuery, normalizeNotifyRow } = require("./shared");
const {
  claimDailyNotificationRun,
  releaseDailyNotificationRun,
  claimOrderOnceNotification,
} = require("./shared/dailyNotificationGuard");

const ADVISORY_LOCK_KEY_1 = 90101;
const ADVISORY_LOCK_KEY_2 = 0;

function createNotifyZeroDaysTask(pool, getSqlCurrentDate) {
  return async function notifyZeroDaysRemainingTask(trigger = "cron") {
    const sqlDate = getSqlCurrentDate();
    const dateYmd = todayYMDInVietnam();
    logger.info(
      `[CRON] Bắt đầu thông báo các đơn đúng ngày hết hạn (số ngày còn lại = 0, Cần Gia Hạn)`,
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
          "[CRON] notifyZeroDays task đang chạy ở process khác — bỏ qua lần gọi trùng",
          { trigger, pid: process.pid }
        );
        return;
      }

      const dailyGuard = await claimDailyNotificationRun(client, {
        notificationCode: "notify-zero-days",
        dateYmd,
        trigger,
      });
      dailyGuardKey = dailyGuard.key;
      if (!dailyGuard.claimed) {
        logger.warn(
          "[CRON] notifyZeroDays đã gửi trong ngày — bỏ qua lần gọi trùng (tránh double Telegram)",
          { trigger, pid: process.pid, dateYmd, dailyGuardKey }
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
        const seenOrderKeys = new Set();
        const uniqueRows = [];
        for (const row of result.rows) {
          const raw = String(row.id_order || row.idOrder || "").trim();
          const k = raw ? raw.toUpperCase() : "";
          if (seenOrderKeys.has(k)) continue;
          seenOrderKeys.add(k);
          uniqueRows.push(row);
        }

        const pending = [];
        for (const row of uniqueRows) {
          const o = normalizeNotifyRow(row, today, nameMap, undefined);
          const code = String(o.id_order || o.idOrder || "").trim();
          if (!code) {
            pending.push({ order: o, perOrderKey: null });
            continue;
          }
          const { claimed, key: perOrderKey } = await claimOrderOnceNotification(client, {
            kind: "0d",
            dateYmd,
            orderCode: code,
            trigger,
          });
          if (claimed) {
            pending.push({ order: o, perOrderKey });
          } else {
            logger.warn(
              "[CRON] Bỏ qua thông báo 0 ngày cho mã đơn (đã gửi hoặc chốt trùng)",
              { orderCode: code, dateYmd, perOrderKey, trigger }
            );
          }
        }

        if (pending.length > 0) {
          try {
            await sendZeroDaysRemainingNotification(pending.map((p) => p.order));
          } catch (sendErr) {
            for (const p of pending) {
              if (p.perOrderKey) {
                await releaseDailyNotificationRun(client, p.perOrderKey);
              }
            }
            throw sendErr;
          }
        }
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
