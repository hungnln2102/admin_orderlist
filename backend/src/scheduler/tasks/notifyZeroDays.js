const logger = require("../../utils/logger");
const { sendZeroDaysRemainingNotification } = require("../../services/telegramOrderNotification");
const { normalizeOrderRow } = require("../../controllers/Order/helpers");
const { todayYMDInVietnam } = require("../../utils/normalizers");
const { STATUS } = require("../../utils/statuses");
const { COL, TABLES, normalizeDateSQL, intFromTextSQL, expiryDateSQL } = require("../sqlHelpers");
const { fetchVariantDisplayNames } = require("../variantDisplayNames");

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
        ${expiryDateSQL()} AS ${COL.expiryDate},
        ${COL.idSupply},
        ${COL.cost},
        ${COL.price},
        ${COL.note},
        ${COL.status}
      FROM ${TABLES.orderList}
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) = 0
        AND ${COL.status} = '${STATUS.RENEWAL}'
      ORDER BY ${COL.idOrder}
    `);

      logger.info(
        `Tìm thấy ${result.rowCount} đơn đúng ngày hết hạn (0 ngày còn lại, trạng thái = Cần Gia Hạn)`
      );

      if (result.rows.length > 0) {
        const today = todayYMDInVietnam();
        const variantIds = result.rows.map((r) => r.id_product).filter((id) => id != null);
        const nameMap = await fetchVariantDisplayNames(client, variantIds);
        const idProductKey = "id_product";
        const normalizedOrders = result.rows.map((row) => {
          const normalized = normalizeOrderRow(row, today);
          const rawIdProduct = row[idProductKey] ?? normalized.id_product ?? normalized.idProduct;
          const productDisplay = rawIdProduct != null && nameMap.get(Number(rawIdProduct)) != null
            ? nameMap.get(Number(rawIdProduct))
            : (typeof rawIdProduct === "string" ? rawIdProduct : String(rawIdProduct ?? ""));
          return {
            id_order: normalized.id_order || normalized.idOrder,
            idOrder: normalized.id_order || normalized.idOrder,
            order_code: normalized.id_order || normalized.idOrder,
            orderCode: normalized.id_order || normalized.idOrder,
            customer: normalized.customer,
            customer_name: normalized.customer,
            id_product: productDisplay || normalized.id_product || normalized.idProduct,
            idProduct: productDisplay || normalized.id_product || normalized.idProduct,
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
            expiry_date: normalized.expiry_date,
            price: normalized.price,
          };
        });

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
