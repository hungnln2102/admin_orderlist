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

      const transfer = await client.query(`
      WITH expired AS (
        SELECT
          ${COL.idOrder},
          ${COL.idProduct},
          ${COL.informationOrder},
          ${COL.customer},
          ${COL.contact},
          ${COL.slot},
          ${normalizeDateSQL(COL.orderDate)} AS ${COL.orderDate},
          ${intFromTextSQL(COL.days)} AS ${COL.days},
          ${expiryDateSQL()} AS ${COL.orderExpired},
          ${COL.idSupply},
          ${COL.cost},
          ${COL.price},
          ${COL.note},
          ${COL.status}
        FROM ${TABLES.orderList}
        WHERE ( ${expiryDateSQL()} - ${sqlDate} ) < 0
          AND (${COL.status} IN (${statusExpiredEligible}))
      )
      INSERT INTO ${TABLES.orderExpired} (
        ${[
          COL.idOrder,
          COL.idProduct,
          COL.informationOrder,
          COL.customer,
          COL.contact,
          COL.slot,
          COL.orderDate,
          COL.days,
          COL.orderExpired,
          COL.idSupply,
          COL.cost,
          COL.price,
          COL.note,
          COL.status,
        ].join(", ")}
      )
      SELECT
        ${COL.idOrder},
        ${COL.idProduct},
        ${COL.informationOrder},
        ${COL.customer},
        ${COL.contact},
        ${COL.slot},
        ${COL.orderDate},
        ${COL.days},
        ${COL.orderExpired},
        ${COL.idSupply},
        ${COL.cost},
        ${COL.price},
        ${COL.note},
        ${COL.status}
      FROM expired
      ON CONFLICT DO NOTHING
      RETURNING ${COL.idOrder};
    `);

      logger.info(`Đã chuyển ${transfer.rowCount} đơn hết hạn (< 0 ngày)`);
      if (transfer.rows.length) {
        const idKey = ORDER_COLS.idOrder;
        const orderIds = transfer.rows.map((r) => r[idKey]).filter(Boolean).join(", ");
        logger.debug(`ID đã lưu: ${orderIds}`);
      }

      const paidToRenewal = await client.query(`
      UPDATE ${TABLES.orderList}
      SET ${COL.status} = '${STATUS.RENEWAL}'
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) BETWEEN 0 AND 4
        AND (${COL.status} = '${STATUS.PAID}');
    `);
      logger.info(`Updated ${paidToRenewal.rowCount} orders to '${STATUS.RENEWAL}' (<= 4 days)`);

      const del = await client.query(`
      DELETE FROM ${TABLES.orderList}
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) < 0
        AND (${COL.status} IN (${statusExpiredEligible}))
      RETURNING ${COL.idOrder};
    `);
      logger.info(`Đã xóa ${del.rowCount} đơn khỏi order_list`);
      if (del.rows.length) {
        const idKey = ORDER_COLS.idOrder;
        const orderIds = del.rows.map((r) => r[idKey]).filter(Boolean).join(", ");
        logger.debug(`ID đã xóa: ${orderIds}`);
      }

      const renewalToExpired = await client.query(`
      UPDATE ${TABLES.orderList}
      SET ${COL.status} = '${STATUS.EXPIRED}'
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) = 0
        AND (${COL.status} = '${STATUS.RENEWAL}');
    `);
      logger.info(`Updated ${renewalToExpired.rowCount} orders to '${STATUS.EXPIRED}' (0 days)`);

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
