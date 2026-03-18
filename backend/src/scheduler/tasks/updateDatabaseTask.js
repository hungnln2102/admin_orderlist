const { STATUS } = require("../../utils/statuses");
const logger = require("../../utils/logger");
const { backupDatabaseToDrive } = require("../../utils/backupService");
const { normalizeOrderRow } = require("../../controllers/Order/helpers");
const { todayYMDInVietnam } = require("../../utils/normalizers");
const { COL, TABLES, ORDER_COLS, normalizeDateSQL, intFromTextSQL, expiryDateSQL } = require("../sqlHelpers");
const { removeMappingsByOrders } = require("../../services/userAccountMappingService");

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

      // Chỉ chuyển đơn từ PAID/RENEWAL → EXPIRED khi đã hết hạn; bỏ qua đơn đã là EXPIRED (tránh update thừa)
      const statusToExpired = [
        `'${STATUS.PAID}'`,
        `'${STATUS.RENEWAL}'`,
      ].join(", ");

      const markExpired = await client.query(`
      UPDATE ${TABLES.orderList}
      SET ${COL.status} = '${STATUS.EXPIRED}'
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) < 0
        AND (${COL.status} IN (${statusToExpired}))
      RETURNING ${COL.idOrder};
    `);
      logger.info(`Đã cập nhật ${markExpired.rowCount} đơn hết hạn (< 0 ngày) sang status EXPIRED`);
      if (markExpired.rows.length) {
        const idKey = ORDER_COLS.idOrder;
        const expiredOrderIds = markExpired.rows.map((r) => r[idKey]).filter(Boolean);
        const orderIds = expiredOrderIds.join(", ");
        logger.debug(`ID đã cập nhật: ${orderIds}`);

        // Xóa mapping trong user_account_mapping cho đơn vừa hết hạn
        if (expiredOrderIds.length > 0) {
          await client.query("COMMIT"); // Commit trước để tránh deadlock
          try {
            await removeMappingsByOrders(expiredOrderIds);
          } catch (mappingErr) {
            logger.warn("[CRON] Xóa mapping thất bại (bỏ qua)", { error: mappingErr.message });
          }
          await client.query("BEGIN"); // Mở lại transaction cho paidToRenewal
        }
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
