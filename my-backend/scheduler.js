// scheduler.js — Chuẩn hóa tiếng Việt, điều chỉnh điều kiện hết hạn

require("dotenv").config();
const { Pool } = require("pg");
const cron = require("node-cron");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Cron: 00:01 hằng ngày
 * - Chuyển đơn hết hạn (<= 0 ngày) sang bảng order_expried
 * - Xóa khỏi order_list sau khi chuyển
 * - Cập nhật trạng thái "Cần Gia Hạn" cho các đơn còn 1..4 ngày
 */
const updateDatabaseTask = async () => {
  console.log("[CRON] Bắt đầu cập nhật đơn hết hạn / cần gia hạn...");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Chuyển các đơn hết hạn (<= 0 ngày) sang order_expried
    const transfer = await client.query(`
      WITH expired AS (
        SELECT * FROM mavryk.order_list
        WHERE (TO_DATE(het_han, 'DD/MM/YYYY') - CURRENT_DATE) <= 0
      )
      INSERT INTO mavryk.order_expried (
        id_don_hang, san_pham, thong_tin_san_pham, khach_hang, link_lien_he,
        slot, ngay_dang_ki, so_ngay_da_dang_ki, het_han, nguon,
        gia_nhap, gia_ban, note, tinh_trang, check_flag
      )
      SELECT id_don_hang, san_pham, thong_tin_san_pham, khach_hang, link_lien_he,
             slot, ngay_dang_ki, so_ngay_da_dang_ki, het_han, nguon,
             gia_nhap, gia_ban, note, tinh_trang, check_flag
      FROM expired;
    `);
    console.log(`  - Đã chuyển ${transfer.rowCount} đơn hết hạn (<= 0 ngày).`);

    // Xóa các đơn đã chuyển khỏi order_list
    const del = await client.query(`
      DELETE FROM mavryk.order_list
      WHERE (TO_DATE(het_han, 'DD/MM/YYYY') - CURRENT_DATE) <= 0;
    `);
    console.log(`  - Đã xóa ${del.rowCount} đơn khỏi order_list.`);

    // 2) Cập nhật "Cần Gia Hạn" cho các đơn còn 1..4 ngày
    const soon = await client.query(`
      UPDATE mavryk.order_list
      SET tinh_trang = 'Cần Gia Hạn',
          check_flag = NULL
      WHERE (TO_DATE(het_han, 'DD/MM/YYYY') - CURRENT_DATE) BETWEEN 1 AND 4
        AND tinh_trang <> 'Đã Thanh Toán';
    `);
    console.log(`  - Cập nhật ${soon.rowCount} đơn sang 'Cần Gia Hạn' (1..4 ngày).`);

    await client.query("COMMIT");
    console.log("[CRON] Hoàn thành cập nhật.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[CRON] Lỗi khi cập nhật:", err);
    throw err;
  } finally {
    client.release();
  }
};

// Lên lịch chạy 00:01 hằng ngày theo múi giờ VN
cron.schedule("1 0 * * *", updateDatabaseTask, { scheduled: true, timezone: "Asia/Ho_Chi_Minh" });

console.log("[Scheduler] Đã khởi động. Cron 00:01 Asia/Ho_Chi_Minh");

module.exports = updateDatabaseTask;
