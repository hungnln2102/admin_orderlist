/**
 * Cron 00:01 — xoá các đơn hết hạn khỏi `system_automation.order_user_tracking`.
 * Điều kiện: `expired::date < (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`.
 *
 * Không đụng các bảng khác (mapping / accounts_admin) — mục đích chỉ làm gọn
 * danh sách user-orders trong UI Renew Adobe Admin.
 */

const { db } = require("@/db");
const logger = require("@/utils/logger");
const {
  SCHEMA_RENEW_ADOBE,
  RENEW_ADOBE_SCHEMA,
  tableName,
} = require("@/config/dbSchema");

const TRACK_TABLE = tableName(
  RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.TABLE,
  SCHEMA_RENEW_ADOBE
);
const TRACK_COLS = RENEW_ADOBE_SCHEMA.ORDER_USER_TRACKING.COLS;

function createCleanupExpiredTrackingTask() {
  return async function cleanupExpiredTrackingTask(trigger = "cron") {
    try {
      const expiredRows = await db(TRACK_TABLE)
        .select(
          TRACK_COLS.ORDER_ID,
          TRACK_COLS.ACCOUNT,
          TRACK_COLS.EXPIRED,
          TRACK_COLS.SYSTEM_NOTE
        )
        .whereNotNull(TRACK_COLS.EXPIRED)
        .whereRaw(
          `(??)::date < (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`,
          [TRACK_COLS.EXPIRED]
        );

      if (expiredRows.length === 0) {
        logger.info(
          "[CRON][cleanup-expired-tracking] 0 đơn hết hạn — không xoá",
          { trigger }
        );
        return { trigger, removed: 0, expiredOrderIds: [] };
      }

      const expiredOrderIds = expiredRows
        .map((r) => String(r[TRACK_COLS.ORDER_ID] || "").trim())
        .filter(Boolean);

      const removed = await db(TRACK_TABLE)
        .whereIn(TRACK_COLS.ORDER_ID, expiredOrderIds)
        .del();

      logger.info(
        "[CRON][cleanup-expired-tracking] Đã xoá %d đơn hết hạn khỏi tracking",
        removed,
        {
          trigger,
          // Chỉ log mã đơn (tránh dày log với danh sách dài).
          previewOrderIds: expiredOrderIds.slice(0, 20),
          more:
            expiredOrderIds.length > 20
              ? expiredOrderIds.length - 20
              : 0,
        }
      );

      return { trigger, removed, expiredOrderIds };
    } catch (err) {
      logger.error("[CRON][cleanup-expired-tracking] Thất bại", {
        trigger,
        error: err?.message,
        stack: err?.stack,
      });
      throw err;
    }
  };
}

module.exports = { createCleanupExpiredTrackingTask };
