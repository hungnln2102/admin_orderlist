// scheduler.js (ĐÃ SỬA LỖI SQL DATE VÀ CẬP NHẬT LOGIC CHUYỂN)

require("dotenv").config();
const { Pool } = require("pg");
const cron = require("node-cron"); // ĐÃ CHUYỂN CRON VÀO ĐÂY

// Kết nối Database (Kết nối lại ở file riêng)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Hàm thực thi logic cập nhật database tự động:
 * 1. Chuyển đơn hàng hết hạn (< 0 ngày) sang order_expried.
 * 2. Cập nhật trạng thái "Hết Hạn" (= 0 ngày).
 * 3. Cập nhật trạng thái "Cần Gia Hạn" (<= 4 ngày và > 0).
 * @returns {Promise<void>}
 */
const updateDatabaseTask = async () => {
  console.log("📅 Bắt đầu tác vụ lập lịch: Cập nhật database...");
  const client = await pool.connect();

  try {
    await client.query("BEGIN"); // Bắt đầu transaction

    // --- Logic 1: Chuyển đơn hàng hết hạn (< 0 ngày) sang order_expried ---

    // BƯỚC 1: Chèn các đơn hàng hết hạn (< 0 ngày) vào bảng order_expried
    const transferResult = await client.query(
      `WITH expired_orders AS (
           SELECT * FROM mavryk.order_list
           WHERE (TO_DATE(het_han, 'DD/MM/YYYY') - CURRENT_DATE) < 0
       )
       INSERT INTO mavryk.order_expried (
           id_don_hang, san_pham, thong_tin_san_pham, khach_hang, link_lien_he,
           slot, ngay_dang_ki, so_ngay_da_dang_ki, het_han, nguon,
           gia_nhap, gia_ban, note, tinh_trang, check_flag
       )
       SELECT
           id_don_hang, san_pham, thong_tin_san_pham, khach_hang, link_lien_he,
           slot, ngay_dang_ki, so_ngay_da_dang_ki, het_han, nguon,
           gia_nhap, gia_ban, note, tinh_trang, check_flag
       FROM expired_orders;`
    );

    console.log(
      `   - Đã chuyển ${transferResult.rowCount} đơn hàng hết hạn (< 0 ngày) sang 'order_expried'.`
    );

    // BƯỚC 2: Xóa các đơn hàng đã chuyển thành công khỏi order_list
    const deleteResult = await client.query(
      `DELETE FROM mavryk.order_list
       WHERE (TO_DATE(het_han, 'DD/MM/YYYY') - CURRENT_DATE) < 0;`
    );
    console.log(
      `   - Đã xóa ${deleteResult.rowCount} đơn hàng khỏi 'order_list' sau khi chuyển.`
    );

    // --- Logic 2: Cập nhật thành "Hết Hạn" (= 0 ngày) ---
    const updateExpiredResult = await client.query(
      `UPDATE mavryk.order_list
       SET
           tinh_trang = 'Hết Hạn',
           check_flag = NULL
       WHERE
           (TO_DATE(het_han, 'DD/MM/YYYY') - CURRENT_DATE) = 0
           AND tinh_trang != 'Đã Thanh Toán';`
    );
    console.log(
      `   - Đã cập nhật ${updateExpiredResult.rowCount} đơn hàng thành 'Hết Hạn' (= 0 ngày).`
    );

    // --- Logic 3: Cập nhật thành "Chưa Thanh Toán" (<= 4 ngày và > 0) ---
    const updateSoonResult = await client.query(
      `UPDATE mavryk.order_list
       SET
           tinh_trang = 'Chưa Thanh Toán',
           check_flag = NULL
       WHERE
           (TO_DATE(het_han, 'DD/MM/YYYY') - CURRENT_DATE) > 0
           AND (TO_DATE(het_han, 'DD/MM/YYYY') - CURRENT_DATE) <= 4
           AND tinh_trang != 'Đã Thanh Toán';`
    );
    console.log(
      `   - Đã cập nhật ${updateSoonResult.rowCount} đơn hàng thành 'Chưa Thanh Toán' (<= 4 ngày).`
    );

    await client.query("COMMIT"); // Hoàn tất transaction thành công
    console.log("✅ Tác vụ lập lịch hoàn thành thành công.");
  } catch (error) {
    await client.query("ROLLBACK"); // Hoàn tác transaction nếu có lỗi
    console.error("❌ Lỗi khi chạy tác vụ lập lịch:", error);
    throw error; // Ném lỗi để index.js có thể bắt được khi gọi thủ công
  } finally {
    client.release(); // Luôn trả kết nối về pool
  }
};

// Lên lịch chạy tác vụ (00:01 mỗi ngày)
cron.schedule("1 0 * * *", updateDatabaseTask, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh", // Đặt múi giờ của bạn
});

console.log("⏰ Scheduler (scheduler.js) đã khởi động.");
console.log(
  "   Tác vụ cập nhật database được lên lịch chạy hàng ngày vào 00:01 sáng (Asia/Ho_Chi_Minh)."
);

// Export hàm để index.js có thể gọi thủ công
module.exports = updateDatabaseTask;
