// scheduler.js - Logic tự động chuyển đơn hàng hết hạn và cập nhật trạng thái

const path = require("path");

// Always load env from this directory, regardless of current working directory
const envPath = path.join(__dirname, ".env");
require("dotenv").config({ path: envPath });
const { Pool } = require("pg");
const cron = require("node-cron");
const { ORDERS_SCHEMA, SCHEMA_ORDERS, getDefinition, tableName } = require("./src/config/dbSchema");
const { backupDatabaseToDrive } = require("./src/utils/backupService");
const { STATUS } = require("./src/utils/statuses");
const logger = require("./src/utils/logger");
const { sendZeroDaysRemainingNotification, sendFourDaysRemainingNotification } = require("./src/services/telegramOrderNotification");
const { normalizeOrderRow } = require("./src/controllers/Order/helpers");
const { todayYMDInVietnam } = require("./src/utils/normalizers");
// Raw column names (unquoted) for reading rows returned by pg
const ORDER_DEF = getDefinition("ORDER_LIST", ORDERS_SCHEMA);
const ORDER_COLS = ORDER_DEF.columns;
const TABLES = {
  orderList: tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS),
  orderExpired: tableName(ORDERS_SCHEMA.ORDER_EXPIRED.TABLE, SCHEMA_ORDERS),
  orderCanceled: tableName(ORDERS_SCHEMA.ORDER_CANCELED.TABLE, SCHEMA_ORDERS),
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
const schedulerTimezone =
  typeof process.env.APP_TIMEZONE === "string" &&
  /^[A-Za-z0-9_\/+\-]+$/.test(process.env.APP_TIMEZONE)
    ? process.env.APP_TIMEZONE
    : DEFAULT_TIMEZONE;
const cronExpression = process.env.CRON_SCHEDULE || "1 0 * * *";
const runOnStart = process.env.RUN_CRON_ON_START === "true";
const enableDbBackup = process.env.ENABLE_DB_BACKUP !== "false";
let lastRunAt = null;


// Quote SQL identifiers safely
const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

// Centralized column names (aligned with src/config/dbSchema.js)
const COL = {
  idOrder: quoteIdent(ORDER_COLS.idOrder),
  idProduct: quoteIdent(ORDER_COLS.idProduct),
  informationOrder: quoteIdent(ORDER_COLS.informationOrder),
  customer: quoteIdent(ORDER_COLS.customer),
  contact: quoteIdent(ORDER_COLS.contact),
  slot: quoteIdent(ORDER_COLS.slot),
  orderDate: quoteIdent(ORDER_COLS.orderDate),
  days: quoteIdent(ORDER_COLS.days),
  orderExpired: quoteIdent(ORDER_COLS.orderExpired),
  supply: quoteIdent(ORDER_COLS.supply),
  cost: quoteIdent(ORDER_COLS.cost),
  price: quoteIdent(ORDER_COLS.price),
  note: quoteIdent(ORDER_COLS.note),
  status: quoteIdent(ORDER_COLS.status),
};

// Normalize mixed-format date columns to a proper DATE in SQL
const normalizeDateSQL = (column) => `
  CASE
    WHEN TRIM(${column}::text) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN TO_DATE(TRIM(${column}::text), 'DD/MM/YYYY')
    WHEN TRIM(${column}::text) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}[ T]' THEN TO_DATE(SUBSTRING(TRIM(${column}::text) FROM 1 FOR 10), 'DD/MM/YYYY')
    WHEN TRIM(${column}::text) ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}$' THEN TO_DATE(TRIM(${column}::text), 'DD-MM-YYYY')
    WHEN TRIM(${column}::text) ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}[ T]' THEN TO_DATE(SUBSTRING(TRIM(${column}::text) FROM 1 FOR 10), 'DD-MM-YYYY')
    WHEN TRIM(${column}::text) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TRIM(${column}::text)::date
    WHEN TRIM(${column}::text) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T]' THEN SUBSTRING(TRIM(${column}::text) FROM 1 FOR 10)::date
    WHEN TRIM(${column}::text) ~ '^[0-9]{4}/[0-9]{2}/[0-9]{2}$' THEN TO_DATE(TRIM(${column}::text), 'YYYY/MM/DD')
    WHEN TRIM(${column}::text) ~ '^[0-9]{8}$' THEN TO_DATE(TRIM(${column}::text), 'YYYYMMDD')
    ELSE NULL
  END`;

// Safely parse integer from possibly-text column
const intFromTextSQL = (column) => `
  CASE WHEN TRIM(${column}::text) ~ '^-?[0-9]+$' THEN TRIM(${column}::text)::int ELSE NULL END
`;

// Expiry date with fallback: normalized het_han, else ngay_dang_ki + days - 1
const expiryDateSQL = () => `
  COALESCE(
    ${normalizeDateSQL(COL.orderExpired)},
    (${normalizeDateSQL(COL.orderDate)} + (COALESCE(${intFromTextSQL(COL.days)}, 0) - 1))
  )
`;

/**
 * Lấy ngày hiện tại để sử dụng trong truy vấn SQL.
 * Cho phép giả định ngày kiểm thử thông qua biến môi trường MOCK_DATE.
 * Định dạng ngày giả định (MOCK_DATE): 'YYYY-MM-DD'.
 */
const getSqlCurrentDate = () => {
  if (process.env.MOCK_DATE) {
    // Trả về ngày giả định dưới dạng SQL Date
    return `'${process.env.MOCK_DATE}'::date`;
  }
  // Trả về ngày hiện tại thực tế của PostgreSQL
  return "(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date";
};

/**
 * Cron: 00:01 hang ngay
 * - Move expired orders (< 0 days) to table order_expired
 * - Remove them from order_list after moving
 * - Update status "Cần Gia Hạn" for orders with 0..4 days left
 */
const updateDatabaseTask = async (trigger = "cron") => {
  const sqlDate = getSqlCurrentDate(); // Lấy ngày thực tế hoặc ngày giả định
  logger.info(
    `[CRON] Bắt đầu cập nhật đơn hết hạn / cần gia hạn`,
    { trigger, date: process.env.MOCK_DATE || "CURRENT_DATE" }
  );

  if (process.env.MOCK_DATE) {
    logger.warn(
      `[TEST MODE] Đang sử dụng ngày giả định: ${process.env.MOCK_DATE}`
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Move expired orders (< 0 days) to expired table
    // Chỉ chuyển đơn PAID / RENEWAL / EXPIRED. Không chuyển PROCESSING (đã nhận webhook, chưa confirm)
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
          -- CHUYỂN ĐỔI TỪ TEXT SANG DATE VÀ INTEGER CHO CÁC CỘT NGÀY/SỐ NGÀY
          ${normalizeDateSQL(COL.orderDate)} AS ${COL.orderDate},
          ${intFromTextSQL(COL.days)} AS ${COL.days},
          ${expiryDateSQL()} AS ${COL.orderExpired},
          -- KẾT THÚC CHUYỂN ĐỔI
          ${COL.supply},
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
          COL.supply,
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
        ${COL.supply},
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
      const orderIds = transfer.rows
        .map((r) => r[idKey])
        .filter(Boolean)
        .join(", ");
      logger.debug(`ID đã lưu: ${orderIds}`);
    }
    // 2a) Update PAID -> RENEWAL when days left <= 4
    const paidToRenewal = await client.query(`
      UPDATE ${TABLES.orderList}
      SET ${COL.status} = '${STATUS.RENEWAL}'
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) BETWEEN 0 AND 4
        AND (${COL.status} = '${STATUS.PAID}');
    `);
    logger.info(
      `Updated ${paidToRenewal.rowCount} orders to '${STATUS.RENEWAL}' (<= 4 days)`
    );

    // Remove moved orders from order_list. Cùng điều kiện với transfer: chỉ PAID/RENEWAL/EXPIRED
    const del = await client.query(`
      DELETE FROM ${TABLES.orderList}
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) < 0
        AND (${COL.status} IN (${statusExpiredEligible}))
      RETURNING ${COL.idOrder};
    `);
    logger.info(`Đã xóa ${del.rowCount} đơn khỏi order_list`);
    if (del.rows.length) {
      const idKey = ORDER_COLS.idOrder;
      const orderIds = del.rows
        .map((r) => r[idKey])
        .filter(Boolean)
        .join(", ");
      logger.debug(`ID đã xóa: ${orderIds}`);
    }
    // 2b) Update RENEWAL -> EXPIRED when days left = 0
    const renewalToExpired = await client.query(`
      UPDATE ${TABLES.orderList}
      SET ${COL.status} = '${STATUS.EXPIRED}'
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) = 0
        AND (${COL.status} = '${STATUS.RENEWAL}');
    `);
    logger.info(
      `Updated ${renewalToExpired.rowCount} orders to '${STATUS.EXPIRED}' (0 days)`
    );

    await client.query("COMMIT");
    logger.info("[CRON] Hoàn thành cập nhật");
    lastRunAt = new Date();

    if (enableDbBackup) {
      try {
        await backupDatabaseToDrive();
      } catch (backupErr) {
        logger.error("[CRON] Backup database failed", { error: backupErr.message, stack: backupErr.stack });
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

const runCronSafe = (source) =>
  updateDatabaseTask(source).catch((err) =>
    logger.error(`[CRON] Failed during ${source}`, { error: err.message, stack: err.stack })
  );

// Allow manual trigger when this file is required directly (useful for debugging)
if (require.main === module && process.argv.includes("--run-once")) {
  runCronSafe("manual");
}

cron.schedule(
  cronExpression,
  () => runCronSafe("cron"),
  {
    scheduled: true,
    timezone: schedulerTimezone,
  }
);

if (runOnStart) {
  runCronSafe("startup");
}

/**
 * Cron: 18:00 hàng ngày
 * - Thông báo các đơn có số ngày còn lại = 0 và trạng thái "Hết Hạn" vào Telegram
 */
const notifyZeroDaysRemainingTask = async (trigger = "cron") => {
  const sqlDate = getSqlCurrentDate();
  logger.info(
    `[CRON] Bắt đầu thông báo các đơn hết hạn (số ngày còn lại = 0, trạng thái = Hết Hạn)`,
    { trigger, date: process.env.MOCK_DATE || "CURRENT_DATE" }
  );

  if (process.env.MOCK_DATE) {
    logger.warn(
      `[TEST MODE] Đang sử dụng ngày giả định: ${process.env.MOCK_DATE}`
    );
  }

  const client = await pool.connect();
  try {
    // Query các đơn có số ngày còn lại = 0 và trạng thái "Hết Hạn"
    const statusEligible = `'${STATUS.EXPIRED}'`;

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
        ${COL.status}
      FROM ${TABLES.orderList}
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) = 0
        AND (${COL.status} = ${statusEligible})
      ORDER BY ${COL.idOrder}
    `);

    logger.info(`Tìm thấy ${result.rowCount} đơn hết hạn (ngày còn lại = 0, trạng thái = Hết Hạn)`);

    if (result.rows.length > 0) {
      // Normalize orders để có format giống như API trả về
      const today = todayYMDInVietnam();
      const normalizedOrders = result.rows.map((row) => {
        const normalized = normalizeOrderRow(row, today);
        return {
          id_order: normalized.id_order || normalized.idOrder,
          idOrder: normalized.id_order || normalized.idOrder,
          order_code: normalized.id_order || normalized.idOrder,
          orderCode: normalized.id_order || normalized.idOrder,
          customer: normalized.customer,
          customer_name: normalized.customer,
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
          price: normalized.price,
        };
      });

      // Gửi thông báo
      await sendZeroDaysRemainingNotification(normalizedOrders);
    } else {
      logger.info("[CRON] Không có đơn nào hết hạn (ngày còn lại = 0, trạng thái = Hết Hạn)");
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

const runZeroDaysNotificationSafe = (source) =>
  notifyZeroDaysRemainingTask(source).catch((err) =>
    logger.error(`[CRON] Zero days notification failed during ${source}`, {
      error: err.message,
      stack: err.stack,
    })
  )

// Cron job chạy lúc 18:00 hàng ngày
cron.schedule(
  "0 18 * * *", // 18:00 mỗi ngày
  () => runZeroDaysNotificationSafe("cron"),
  {
    scheduled: true,
    timezone: schedulerTimezone,
  }
);

/**
 * Cron: 07:00 hàng ngày
 * - Thông báo các đơn cần gia hạn (còn 4 ngày) vào Telegram
 */
const notifyFourDaysRemainingTask = async (trigger = "cron") => {
  const sqlDate = getSqlCurrentDate();
  logger.info(
    `[CRON] Bắt đầu thông báo các đơn cần gia hạn (còn 4 ngày)`,
    { trigger, date: process.env.MOCK_DATE || "CURRENT_DATE" }
  );

  if (process.env.MOCK_DATE) {
    logger.warn(
      `[TEST MODE] Đang sử dụng ngày giả định: ${process.env.MOCK_DATE}`
    );
  }

  const client = await pool.connect();
  try {
    // Query các đơn có số ngày còn lại = 4 và status = RENEWAL (Cần Gia Hạn)
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
      // Normalize orders để có format giống như API trả về
      const today = todayYMDInVietnam();
      const normalizedOrders = result.rows.map((row) => {
        const normalized = normalizeOrderRow(row, today);
        return {
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
          price: normalized.price,
          days_left: row.days_left || 4,
        };
      });

      // Gửi thông báo
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

const runFourDaysNotificationSafe = (source) =>
  notifyFourDaysRemainingTask(source).catch((err) =>
    logger.error(`[CRON] Four days notification failed during ${source}`, {
      error: err.message,
      stack: err.stack,
    })
  );

// Cron job chạy lúc 07:00 hàng ngày - Thông báo đơn cần gia hạn (còn 4 ngày)
cron.schedule(
  "0 7 * * *", // 07:00 mỗi ngày
  () => runFourDaysNotificationSafe("cron"),
  {
    scheduled: true,
    timezone: schedulerTimezone,
  }
);

logger.info(
  `[Scheduler] Đã khởi động`,
  { cronExpression, schedulerTimezone, runOnStart }
);

module.exports = {
  updateDatabaseTask,
  notifyZeroDaysRemainingTask,
  notifyFourDaysRemainingTask,
  getSchedulerStatus: () => ({
    timezone: schedulerTimezone,
    cronExpression,
    runOnStart,
    lastRunAt,
  }),
};
