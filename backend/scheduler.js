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
  checkFlag: quoteIdent(ORDER_COLS.checkFlag),
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
 * - Update status "Cần Gia Hạn" for orders with 1..4 days left
 */
const updateDatabaseTask = async (trigger = "cron") => {
  const sqlDate = getSqlCurrentDate(); // Lấy ngày thực tế hoặc ngày giả định
  console.log(
    `[CRON] Bắt đầu cập nhật đơn hết hạn / cần gia hạn (Trigger: ${trigger}, Date: ${
      process.env.MOCK_DATE || "CURRENT_DATE"
    })...`
  );

  if (process.env.MOCK_DATE) {
    console.warn(
      `[TEST MODE] Đang sử dụng ngày giả định: ${process.env.MOCK_DATE}`
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Move expired orders (< 0 days) to expired table
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
          ${COL.status},
          ${COL.checkFlag}
        FROM ${TABLES.orderList}
        WHERE ( ${expiryDateSQL()} - ${sqlDate} ) < 0
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
          COL.checkFlag,
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
        ${COL.status},
        ${COL.checkFlag}
      FROM expired
      ON CONFLICT DO NOTHING
      RETURNING ${COL.idOrder};
    `);
    console.log(`  - Đã chuyển ${transfer.rowCount} đơn hết hạn (< 0 ngày).`);
    if (transfer.rows.length) {
      const idKey = ORDER_COLS.idOrder;
      console.log(
        `    -> ID đã lưu: ${transfer.rows
          .map((r) => r[idKey])
          .filter(Boolean)
          .join(", ")}`
      );
    }

    // 2a) Update 0 ngay con lai -> 'Hết Hạn'
    const dueToday = await client.query(`
      UPDATE ${TABLES.orderList}
      SET ${COL.status} = '${STATUS.EXPIRED}',
          ${COL.checkFlag} = NULL
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) = 0
        AND (${COL.status} IS DISTINCT FROM '${STATUS.PAID}')
        AND (${COL.status} IS DISTINCT FROM '${STATUS.EXPIRED}');
    `);
    console.log(
      `  - Cập nhật ${dueToday.rowCount} đơn sang '${STATUS.EXPIRED}' (0 ngày).`
    );

    // Remove moved orders from order_list (Không cần chuyển đổi kiểu dữ liệu ở đây)
    const del = await client.query(`
      DELETE FROM ${TABLES.orderList}
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) < 0
      RETURNING ${COL.idOrder};
    `);
    console.log(`  - Đã xóa ${del.rowCount} đơn khỏi order_list.`);
    if (del.rows.length) {
      const idKey = ORDER_COLS.idOrder;
      console.log(
        `    -> ID đã xóa: ${del.rows
          .map((r) => r[idKey])
          .filter(Boolean)
          .join(", ")}`
      );
    }

    // 2) Update "Cần Gia Hạn" for orders with 1..4 days remaining (Không cần chuyển đổi kiểu dữ liệu ở đây)
    // 2b) Update 1..4 ngay -> 'Cần Gia Hạn'
    const soon = await client.query(`
      UPDATE ${TABLES.orderList}
      SET ${COL.status} = '${STATUS.RENEWAL}',
          ${COL.checkFlag} = NULL
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) BETWEEN 1 AND 4
        AND (${COL.status} IS DISTINCT FROM '${STATUS.EXPIRED}')
        AND (${COL.status} IS DISTINCT FROM '${STATUS.RENEWAL}');
    `);
    console.log(
      `  - Cập nhật ${soon.rowCount} đơn sang '${STATUS.RENEWAL}' (1..4 ngày).`
    );

    await client.query("COMMIT");
    console.log("[CRON] Hoàn thành cập nhật.");
    lastRunAt = new Date();

    if (enableDbBackup) {
      try {
        await backupDatabaseToDrive();
      } catch (backupErr) {
        console.error("[CRON] Backup database failed:", backupErr);
      }
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[CRON] Lỗi khi cập nhật:", err);
    throw err;
  } finally {
    client.release();
  }
};

const runCronSafe = (source) =>
  updateDatabaseTask(source).catch((err) =>
    console.error(`[CRON] Failed during ${source}:`, err)
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

console.log(
  `[Scheduler] Đã khởi động. Cron ${cronExpression} ${schedulerTimezone}${
    runOnStart ? " (run on start enabled)" : ""
  }`
);

module.exports = {
  updateDatabaseTask,
  getSchedulerStatus: () => ({
    timezone: schedulerTimezone,
    cronExpression,
    runOnStart,
    lastRunAt,
  }),
};
