// scheduler.js - Logic tự động chuyển đơn hàng hết hạn và cập nhật trạng thái

require("dotenv").config();
const { Pool } = require("pg");
const cron = require("node-cron");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
 * - Move expired orders (< 0 days) to table order_expried
 * - Remove them from order_list after moving
 * - Update status "Can Gia Han" for orders with 1..4 days left
 */
const updateDatabaseTask = async () => {
  const sqlDate = getSqlCurrentDate(); // Lấy ngày thực tế hoặc ngày giả định
  console.log(
    `[CRON] Bat dau cap nhat don het han / can gia han (Date: ${
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

    // 1) Move expired orders (< 0 days) to mavryk.order_expried
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
          TO_DATE(ngay_dang_ki, 'DD/MM/YYYY') AS ngay_dang_ki, 
          so_ngay_da_dang_ki::integer AS so_ngay_da_dang_ki, 
          TO_DATE(het_han, 'DD/MM/YYYY') AS het_han, 
          -- KẾT THÚC CHUYỂN ĐỔI
          nguon,
          gia_nhap,
          gia_ban,
          note,
          tinh_trang,
          check_flag
        FROM mavryk.order_list
        WHERE (TO_DATE(het_han, 'DD/MM/YYYY') - ${sqlDate}) < 0
      )
      INSERT INTO mavryk.order_expried (
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
      ON CONFLICT (id_don_hang) DO NOTHING
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

    // 2a) Update 0 ngay con lai -> 'Het Han'
    const dueToday = await client.query(`
      UPDATE mavryk.order_list
      SET tinh_trang = 'Het Han',
          check_flag = NULL
      WHERE (TO_DATE(het_han, 'DD/MM/YYYY') - ${sqlDate}) = 0
        AND (tinh_trang IS DISTINCT FROM 'Da Thanh Toan')
        AND (tinh_trang IS DISTINCT FROM 'Het Han');
    `);
    console.log(`  - Cap nhat ${dueToday.rowCount} don sang 'Het Han' (0 ngay).`);

    // Remove moved orders from order_list (Không cần chuyển đổi kiểu dữ liệu ở đây)
    const del = await client.query(`
      DELETE FROM mavryk.order_list
      WHERE (TO_DATE(het_han, 'DD/MM/YYYY') - ${sqlDate}) < 0
      RETURNING id_don_hang;
    `);
    console.log(`  - Da xoa ${del.rowCount} don khoi order_list.`);
    if (del.rows.length) {
      console.log(
        `    -> ID da xoa: ${del.rows.map((r) => r.id_don_hang).join(", ")}`
      );
    }

    // 2) Update "Can Gia Han" for orders with 1..4 days remaining (Không cần chuyển đổi kiểu dữ liệu ở đây)
    // 2b) Update 1..4 ngay -> 'Can Gia Han'
    const soon = await client.query(`
      UPDATE mavryk.order_list
      SET tinh_trang = 'Can Gia Han',
          check_flag = NULL
      WHERE (TO_DATE(het_han, 'DD/MM/YYYY') - ${sqlDate}) BETWEEN 1 AND 4
        AND (tinh_trang IS DISTINCT FROM 'Da Thanh Toan')
        AND (tinh_trang IS DISTINCT FROM 'Het Han');
    `);
    console.log(
      `  - Cap nhat ${soon.rowCount} don sang 'Can Gia Han' (1..4 ngay).`
    );

    await client.query("COMMIT");
    console.log("[CRON] Hoan thanh cap nhat.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[CRON] Loi khi cap nhat:", err);
    throw err;
  } finally {
    client.release();
  }
};

// Schedule at 00:01 every day in Vietnam timezone
cron.schedule("1 0 * * *", updateDatabaseTask, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh",
});

console.log("[Scheduler] Da khoi dong. Cron 00:01 Asia/Ho_Chi_Minh");

module.exports = updateDatabaseTask;
