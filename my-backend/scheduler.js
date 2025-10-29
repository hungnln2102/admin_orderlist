require("dotenv").config(); // Tải biến môi trường (DATABASE_URL) từ file .env
const { Pool } = require("pg");
const cron = require("node-cron");

// 1. Khởi tạo kết nối Database (Giống index.js)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Hàm thực thi logic cập nhật database.
 */
const updateDatabaseTask = async () => {
  console.log("📅 Bắt đầu tác vụ lập lịch: Cập nhật database...");
  const client = await pool.connect(); // Lấy một kết nối từ pool

  try {
    await client.query("BEGIN"); // Bắt đầu transaction để đảm bảo an toàn

    // --- Logic 1: Xóa đơn hàng hết hạn (< 0 ngày) ---
    const deleteResult = await client.query(
      `DELETE FROM mavryk.order_list
       WHERE (het_han::date - CURRENT_DATE) < 0;`
    );
    console.log(
      `   - Đã xóa ${deleteResult.rowCount} đơn hàng hết hạn (< 0 ngày).`
    );

    // --- Logic 2: Cập nhật thành "Hết Hạn" (= 0 ngày) ---
    const updateExpiredResult = await client.query(
      `UPDATE mavryk.order_list
       SET
           tinh_trang = 'Hết Hạn',
           check_flag = NULL
       WHERE
           (het_han::date - CURRENT_DATE) = 0
           AND tinh_trang != 'Đã Thanh Toán';` // Quan trọng: Không ghi đè đơn đã thanh toán
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
           (het_han::date - CURRENT_DATE) > 0
           AND (het_han::date - CURRENT_DATE) <= 4
           AND tinh_trang != 'Đã Thanh Toán';` // Quan trọng: Không ghi đè đơn đã thanh toán
    );
    console.log(
      `   - Đã cập nhật ${updateSoonResult.rowCount} đơn hàng thành 'Chưa Thanh Toán' (<= 4 ngày).`
    );

    await client.query("COMMIT"); // Hoàn tất transaction thành công
    console.log("✅ Tác vụ lập lịch hoàn thành thành công.");
  } catch (error) {
    await client.query("ROLLBACK"); // Hoàn tác transaction nếu có lỗi
    console.error("❌ Lỗi khi chạy tác vụ lập lịch:", error);
  } finally {
    client.release(); // Luôn trả kết nối về pool
  }
};

// =======================================================
// 3. Lên lịch chạy tác vụ (Ví dụ: 00:01 mỗi ngày)
// =======================================================
// Chạy vào 1 phút sau nửa đêm, mỗi ngày
cron.schedule("1 0 * * *", updateDatabaseTask, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh", // Đặt múi giờ của bạn
});

console.log("⏰ Scheduler (scheduler.js) đã khởi động.");
console.log(
  "   Tác vụ cập nhật database được lên lịch chạy hàng ngày vào 00:01 sáng (Asia/Ho_Chi_Minh)."
);

// (Tùy chọn) Chạy tác vụ ngay lập tức khi khởi động để test
// updateDatabaseTask();
