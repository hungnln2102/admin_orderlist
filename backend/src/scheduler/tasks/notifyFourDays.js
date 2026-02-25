const logger = require("../../utils/logger");
const { sendFourDaysRemainingNotification } = require("../../services/telegramOrderNotification");
const { normalizeOrderRow } = require("../../controllers/Order/helpers");
const { todayYMDInVietnam } = require("../../utils/normalizers");
const { STATUS } = require("../../utils/statuses");
const { computeOrderCurrentPrice } = require("../../../webhook/sepay/renewal");
const { COL, TABLES, normalizeDateSQL, intFromTextSQL, expiryDateSQL } = require("../sqlHelpers");

function createNotifyFourDaysTask(pool, getSqlCurrentDate) {
  return async function notifyFourDaysRemainingTask(trigger = "cron") {
    const sqlDate = getSqlCurrentDate();
    logger.info(
      `[CRON] Bắt đầu thông báo các đơn cần gia hạn (còn 4 ngày)`,
      { trigger, date: process.env.MOCK_DATE || "CURRENT_DATE" }
    );

    if (process.env.MOCK_DATE) {
      logger.warn(`[TEST MODE] Đang sử dụng ngày giả định: ${process.env.MOCK_DATE}`);
    }

    const client = await pool.connect();
    try {
      const statusEligible = `'${STATUS.RENEWAL}'`;

      const result = await client.query(`
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
        ${COL.supply},
        ${COL.cost},
        ${COL.price},
        ${COL.note},
        ${COL.status},
        ( ${expiryDateSQL()} - ${sqlDate} ) AS days_left
      FROM ${TABLES.orderList}
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) = 4
        AND (${COL.status} = ${statusEligible})
      ORDER BY ${COL.idOrder}
    `);

      logger.info(`Tìm thấy ${result.rowCount} đơn cần gia hạn (còn 4 ngày)`);

      if (result.rows.length > 0) {
        const today = todayYMDInVietnam();
        const normalizedOrders = [];
        for (const row of result.rows) {
          const normalized = normalizeOrderRow(row, today);
          const computed = await computeOrderCurrentPrice(client, row);
          normalizedOrders.push({
            id_order: normalized.id_order || normalized.idOrder,
            idOrder: normalized.id_order || normalized.idOrder,
            order_code: normalized.id_order || normalized.idOrder,
            orderCode: normalized.id_order || normalized.idOrder,
            customer: normalized.customer,
            customer_name: normalized.customer,
            contact: normalized.contact,
            customer_link: normalized.contact,
            id_product: normalized.id_product || normalized.idProduct,
            idProduct: normalized.id_product || normalized.idProduct,
            information_order: normalized.information_order || normalized.informationOrder,
            informationOrder: normalized.information_order || normalized.informationOrder,
            slot: normalized.slot,
            registration_date_display: normalized.registration_date_display,
            registration_date_str: normalized.registration_date_str,
            order_date: normalized.order_date || normalized.registration_date,
            days: normalized.days || normalized.total_days,
            total_days: normalized.days || normalized.total_days,
            expiry_date_display: normalized.expiry_date_display,
            expiry_date_str: normalized.expiry_date_display,
            order_expired: normalized.order_expired || normalized.expiry_date,
            price: computed.price,
            days_left: row.days_left || 4,
          });
        }

        await sendFourDaysRemainingNotification(normalizedOrders);
      } else {
        logger.info("[CRON] Không có đơn nào cần gia hạn (còn 4 ngày)");
      }
    } catch (err) {
      logger.error("[CRON] Lỗi khi thông báo đơn cần gia hạn (còn 4 ngày)", {
        error: err.message,
        stack: err.stack,
      });
      throw err;
    } finally {
      client.release();
    }
  };
}

module.exports = { createNotifyFourDaysTask };
