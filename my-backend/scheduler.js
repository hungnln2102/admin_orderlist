// scheduler.js - Logic tự động chuyển đơn hàng hết hạn và cập nhật trạng thái

require("dotenv").config();
const { Pool } = require("pg");
const cron = require("node-cron");

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
    ${normalizeDateSQL('het_han')},
    (${normalizeDateSQL('ngay_dang_ki')} + (COALESCE(${intFromTextSQL('so_ngay_da_dang_ki')}, 0) - 1))
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

    // 1) Move expired orders (< 0 days) to mavryk.order_expired
    const transfer = await client.query(`
      WITH expired AS (
        SELECT
          id_don_hang,
          san_pham,
          thong_tin_san_pham,
          khach_hang,
          link_lien_he,
          slot,
          -- CHUYỂN ĐỔI TỪ TEXT SANG DATE VÀ INTEGER CHO CÁC CỘT NGÀY/SỐ NGÀY
          ${normalizeDateSQL('ngay_dang_ki')} AS ngay_dang_ki, 
          ${intFromTextSQL('so_ngay_da_dang_ki')} AS so_ngay_da_dang_ki, 
          ${expiryDateSQL()} AS het_han, 
          -- KẾT THÚC CHUYỂN ĐỔI
          nguon,
          gia_nhap,
          gia_ban,
          note,
          tinh_trang,
          check_flag
        FROM mavryk.order_list
        WHERE ( ${expiryDateSQL()} - ${sqlDate} ) < 0
      )
      INSERT INTO mavryk.order_expired (
        id_don_hang,
        san_pham,
        thong_tin_san_pham,
        khach_hang,
        link_lien_he,
        slot,
        ngay_dang_ki,
        so_ngay_da_dang_ki,
        het_han,
        nguon,
        gia_nhap,
        gia_ban,
        note,
        tinh_trang,
        check_flag
      ) 
      SELECT 
        id_don_hang,
        san_pham,
        thong_tin_san_pham,
        khach_hang,
        link_lien_he,
        slot,
        ngay_dang_ki,
        so_ngay_da_dang_ki,
        het_han,
        nguon,
        gia_nhap,
        gia_ban,
        note,
        tinh_trang,
        check_flag
      FROM expired
      ON CONFLICT DO NOTHING
      RETURNING id_don_hang;
    `);
    console.log(`  - Da chuyen ${transfer.rowCount} don het han (< 0 ngay).`);
    if (transfer.rows.length) {
      console.log(
        `    -> ID da luu: ${transfer.rows
          .map((r) => r.id_don_hang)
          .join(", ")}`
      );
    }

    // 2a) Update 0 ngay con lai -> 'Hết Hạn'
    const dueToday = await client.query(`
      UPDATE mavryk.order_list
      SET tinh_trang = '${STATUS_EXPIRED}',
          check_flag = NULL
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) = 0
        AND (tinh_trang IS DISTINCT FROM '${STATUS_PAID}')
        AND (tinh_trang IS DISTINCT FROM '${STATUS_EXPIRED}');
    `);
    console.log(
      `  - Cap nhat ${dueToday.rowCount} don sang '${STATUS_EXPIRED}' (0 ngay).`
    );

    // Remove moved orders from order_list (Không cần chuyển đổi kiểu dữ liệu ở đây)
    const del = await client.query(`
      DELETE FROM mavryk.order_list
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) < 0
      RETURNING id_don_hang;
    `);
    console.log(`  - Da xoa ${del.rowCount} don khoi order_list.`);
    if (del.rows.length) {
      console.log(
        `    -> ID da xoa: ${del.rows.map((r) => r.id_don_hang).join(", ")}`
      );
    }

    // 2) Update "Cần Gia Hạn" for orders with 1..4 days remaining (Không cần chuyển đổi kiểu dữ liệu ở đây)
    // 2b) Update 1..4 ngay -> 'Cần Gia Hạn'
    const soon = await client.query(`
      UPDATE mavryk.order_list
      SET tinh_trang = '${STATUS_RENEW}',
          check_flag = NULL
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) BETWEEN 1 AND 4
        AND (tinh_trang IS DISTINCT FROM '${STATUS_PAID}')
        AND (tinh_trang IS DISTINCT FROM '${STATUS_EXPIRED}')
        AND (tinh_trang IS DISTINCT FROM '${STATUS_RENEW}');
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
