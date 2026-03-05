const { STATUS } = require("../../utils/statuses");
const logger = require("../../utils/logger");
const { backupDatabaseToDrive } = require("../../utils/backupService");
const { normalizeOrderRow } = require("../../controllers/Order/helpers");
const { todayYMDInVietnam } = require("../../utils/normalizers");
const { COL, TABLES, ORDER_COLS, normalizeDateSQL, intFromTextSQL, expiryDateSQL } = require("../sqlHelpers");

let lastRunAt = null;

function createUpdateDatabaseTask(pool, getSqlCurrentDate, enableDbBackup) {
  return async function updateDatabaseTask(trigger = "cron") {
    const sqlDate = getSqlCurrentDate();
    logger.info(
      `[CRON] Bắt đầu cập nhật đơn hết hạn / cần gia hạn`,
      { trigger, date: process.env.MOCK_DATE || "CURRENT_DATE" }
    );

    if (process.env.MOCK_DATE) {
      logger.warn(`[TEST MODE] Đang sử dụng ngày giả định: ${process.env.MOCK_DATE}`);
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const statusExpiredEligible = [
        `'${STATUS.PAID}'`,
        `'${STATUS.RENEWAL}'`,
        `'${STATUS.EXPIRED}'`,
      ].join(", ");

      // Gom 1 bảng: chỉ cập nhật status, không chuyển sang bảng order_expired
      const markExpired = await client.query(`
      UPDATE ${TABLES.orderList}
      SET ${COL.status} = '${STATUS.EXPIRED}'
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) < 0
        AND (${COL.status} IN (${statusExpiredEligible}))
      RETURNING ${COL.idOrder};
    `);
      logger.info(`Đã cập nhật ${markExpired.rowCount} đơn hết hạn (< 0 ngày) sang status EXPIRED`);
      if (markExpired.rows.length) {
        const idKey = ORDER_COLS.idOrder;
        const orderIds = markExpired.rows.map((r) => r[idKey]).filter(Boolean).join(", ");
        logger.debug(`ID đã cập nhật: ${orderIds}`);
      }

      // 0 <= số ngày còn lại <= 4 → Cần Gia Hạn (RENEWAL); < 0 → đã xử lý ở markExpired (Hết Hạn)
      const paidToRenewal = await client.query(`
      UPDATE ${TABLES.orderList}
      SET ${COL.status} = '${STATUS.RENEWAL}'
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) BETWEEN 0 AND 4
        AND (${COL.status} = '${STATUS.PAID}');
    `);
      logger.info(`Updated ${paidToRenewal.rowCount} orders to '${STATUS.RENEWAL}' (0 <= days left <= 4)`);

      await client.query("COMMIT");
      logger.info("[CRON] Hoàn thành cập nhật");
      lastRunAt = new Date();

      if (enableDbBackup) {
        try {
          await backupDatabaseToDrive();
        } catch (backupErr) {
          logger.error("[CRON] Backup database failed", {
            error: backupErr.message,
            stack: backupErr.stack,
          });
        }
      }
    } catch (err) {
      await client.query("ROLLBACK");
      logger.error("[CRON] Lỗi khi cập nhật", { error: err.message, stack: err.stack });
      throw err;
    } finally {
      client.release();
    }
  };
}

function getLastRunAt() {
  return lastRunAt;
}

function setLastRunAt(value) {
  lastRunAt = value;
}

module.exports = {
  createUpdateDatabaseTask,
  getLastRunAt,
  setLastRunAt,
};
