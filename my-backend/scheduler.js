// scheduler.js - Logic tự động chuyển đơn hàng hết hạn và cập nhật trạng thái

const path = require("path");

// Always load env from this directory, regardless of current working directory
const envPath = path.join(__dirname, ".env");
require("dotenv").config({ path: envPath });
const { Pool } = require("pg");
const cron = require("node-cron");
const { DB_DEFINITIONS, TABLES, SCHEMA } = require("./schema/tables");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
const schedulerTimezone =
  typeof process.env.APP_TIMEZONE === "string" &&
  /^[A-Za-z0-9_\/+\-]+$/.test(process.env.APP_TIMEZONE)
    ? process.env.APP_TIMEZONE
    : DEFAULT_TIMEZONE;
const cronExpression = process.env.CRON_SCHEDULE || "1 0 * * *";
const runOnStart = process.env.RUN_CRON_ON_START === "true";
let lastRunAt = null;

const STATUS_EXPIRED = "Hết Hạn";
const STATUS_RENEW = "Cần Gia Hạn";
const STATUS_PAID = "Đã Thanh Toán";

// Quote SQL identifiers safely
const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

// Centralized column names (aligned with schema/tables.js)
const COL = {
  idOrder: quoteIdent(DB_DEFINITIONS.orderList.columns.idOrder),
  idProduct: quoteIdent(DB_DEFINITIONS.orderList.columns.idProduct),
  informationOrder: quoteIdent(DB_DEFINITIONS.orderList.columns.informationOrder),
  customer: quoteIdent(DB_DEFINITIONS.orderList.columns.customer),
  contact: quoteIdent(DB_DEFINITIONS.orderList.columns.contact),
  slot: quoteIdent(DB_DEFINITIONS.orderList.columns.slot),
  orderDate: quoteIdent(DB_DEFINITIONS.orderList.columns.orderDate),
  days: quoteIdent(DB_DEFINITIONS.orderList.columns.days),
  orderExpired: quoteIdent(DB_DEFINITIONS.orderList.columns.orderExpired),
  supply: quoteIdent(DB_DEFINITIONS.orderList.columns.supply),
  cost: quoteIdent(DB_DEFINITIONS.orderList.columns.cost),
  price: quoteIdent(DB_DEFINITIONS.orderList.columns.price),
  note: quoteIdent(DB_DEFINITIONS.orderList.columns.note),
  status: quoteIdent(DB_DEFINITIONS.orderList.columns.status),
  checkFlag: quoteIdent(DB_DEFINITIONS.orderList.columns.checkFlag),
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
    `[CRON] Bat dau cap nhat don het han / can gia han (Trigger: ${trigger}, Date: ${
      process.env.MOCK_DATE || "CURRENT_DATE"
    })...`
  );

  if (process.env.MOCK_DATE) {
    console.warn(
      `[TEST MODE] Dang su dung ngay gia dinh: ${process.env.MOCK_DATE}`
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
    console.log(`  - Da chuyen ${transfer.rowCount} don het han (< 0 ngay).`);
    if (transfer.rows.length) {
      const idKey = ORDER_COLS.idOrder;
      console.log(
        `    -> ID da luu: ${transfer.rows
          .map((r) => r[idKey])
          .filter(Boolean)
          .join(", ")}`
      );
    }

    // 2a) Update 0 ngay con lai -> 'Hết Hạn'
    const dueToday = await client.query(`
      UPDATE ${TABLES.orderList}
      SET ${COL.status} = '${STATUS_EXPIRED}',
          ${COL.checkFlag} = NULL
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) = 0
        AND (${COL.status} IS DISTINCT FROM '${STATUS_PAID}')
        AND (${COL.status} IS DISTINCT FROM '${STATUS_EXPIRED}');
    `);
    console.log(
      `  - Cap nhat ${dueToday.rowCount} don sang '${STATUS_EXPIRED}' (0 ngay).`
    );

    // Remove moved orders from order_list (Không cần chuyển đổi kiểu dữ liệu ở đây)
    const del = await client.query(`
      DELETE FROM ${TABLES.orderList}
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) < 0
      RETURNING ${COL.idOrder};
    `);
    console.log(`  - Da xoa ${del.rowCount} don khoi order_list.`);
    if (del.rows.length) {
      const idKey = ORDER_COLS.idOrder;
      console.log(
        `    -> ID da xoa: ${del.rows
          .map((r) => r[idKey])
          .filter(Boolean)
          .join(", ")}`
      );
    }

    // 2) Update "Cần Gia Hạn" for orders with 1..4 days remaining (Không cần chuyển đổi kiểu dữ liệu ở đây)
    // 2b) Update 1..4 ngay -> 'Cần Gia Hạn'
    const soon = await client.query(`
      UPDATE ${TABLES.orderList}
      SET ${COL.status} = '${STATUS_RENEW}',
          ${COL.checkFlag} = NULL
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) BETWEEN 1 AND 4
        AND (${COL.status} IS DISTINCT FROM '${STATUS_EXPIRED}')
        AND (${COL.status} IS DISTINCT FROM '${STATUS_RENEW}');
    `);
    console.log(
      `  - Cap nhat ${soon.rowCount} don sang '${STATUS_RENEW}' (1..4 ngay).`
    );

    await client.query("COMMIT");
    console.log("[CRON] Hoan thanh cap nhat.");
    lastRunAt = new Date();
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[CRON] Loi khi cap nhat:", err);
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
  `[Scheduler] Da khoi dong. Cron ${cronExpression} ${schedulerTimezone}${
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
