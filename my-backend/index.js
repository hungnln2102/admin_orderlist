require("dotenv").config(); // Tải biến môi trường từ file .env
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const cron = require("node-cron"); // Import node-cron

const app = express();
const port = 3001;

// 1. Cấu hình CORS (Cho phép React gọi đến)
app.use(
  cors({
    origin: "http://localhost:5173", // Cổng React app của bạn
  })
);

// 2. Middleware để đọc JSON từ body (cho webhook)
app.use(express.json());

// 3. Kết nối Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 4. API endpoint để LẤY danh sách đơn hàng (GET /api/orders)
app.get("/api/orders", async (req, res) => {
  console.log("Đã nhận yêu cầu GET /api/orders");
  try {
    const result = await pool.query("SELECT * FROM mavryk.order_list"); // Đã sửa schema
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi truy vấn database (GET):", err);
    res.status(500).json({ error: "Lỗi server nội bộ khi lấy đơn hàng" });
  }
});

// 5. API endpoint để CẬP NHẬT đơn hàng qua Webhook (POST /api/webhook/payment)
app.post("/api/webhook/payment", async (req, res) => {
  console.log("Đã nhận yêu cầu POST /api/webhook/payment");
  const { ma_don_hang } = req.body;

  if (!ma_don_hang) {
    console.warn("Webhook thiếu 'ma_don_hang' trong body");
    return res.status(400).json({ error: "Thiếu thông tin mã đơn hàng" });
  }

  try {
    const result = await pool.query(
      "UPDATE mavryk.order_list SET tinh_trang = $1 WHERE id_don_hang = $2",
      ["Đã Thanh Toán", ma_don_hang]
    );

    if (result.rowCount === 0) {
      console.warn(
        `Webhook: Không tìm thấy đơn hàng ${ma_don_hang} để cập nhật.`
      );
      return res
        .status(404)
        .json({ error: `Không tìm thấy đơn hàng ${ma_don_hang}` });
    }

    console.log(`Đã cập nhật đơn hàng ${ma_don_hang} thành 'Đã Thanh Toán'.`);
    res
      .status(200)
      .json({ success: true, message: `Đã cập nhật đơn hàng ${ma_don_hang}` });
  } catch (err) {
    console.error("Lỗi khi update database (POST webhook):", err);
    res.status(500).json({ error: "Lỗi server nội bộ khi cập nhật đơn hàng" });
  }
});

// 6. API endpoint để LẤY CHI TIẾT một đơn hàng (GET /api/orders/:id)
app.get("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`Đã nhận yêu cầu GET /api/orders/${id}`);
  try {
    const result = await pool.query(
      "SELECT * FROM mavryk.order_list WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Lỗi khi lấy chi tiết đơn hàng ${id}:`, err);
    res
      .status(500)
      .json({ error: "Lỗi server nội bộ khi lấy chi tiết đơn hàng" });
  }
});

// 7. API endpoint để CẬP NHẬT một đơn hàng (PUT /api/orders/:id)
app.put("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  const orderData = req.body;
  console.log(`Đã nhận yêu cầu PUT /api/orders/${id}`);

  // Tạo danh sách các trường cần cập nhật và giá trị tương ứng
  const fields = Object.keys(orderData)
    .map((key, index) => `"${key}" = $${index + 1}`)
    .join(", ");
  const values = Object.values(orderData);

  if (fields.length === 0) {
    return res.status(400).json({ error: "Không có dữ liệu để cập nhật" });
  }

  try {
    const queryText = `UPDATE mavryk.order_list SET ${fields} WHERE id = $${
      values.length + 1
    } RETURNING *`;
    const queryValues = [...values, id];

    const result = await pool.query(queryText, queryValues);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy đơn hàng để cập nhật" });
    }

    console.log(`Đã cập nhật đơn hàng ID ${id}.`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Lỗi khi cập nhật đơn hàng ${id}:`, err);
    res.status(500).json({ error: "Lỗi server nội bộ khi cập nhật đơn hàng" });
  }
});

// 8. API endpoint để XÓA một đơn hàng (DELETE /api/orders/:id)
app.delete("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`Đã nhận yêu cầu DELETE /api/orders/${id}`);
  try {
    const result = await pool.query(
      "DELETE FROM mavryk.order_list WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng để xóa" });
    }

    console.log(`Đã xóa đơn hàng ID ${id}.`);
    res
      .status(200)
      .json({ success: true, message: `Đã xóa đơn hàng ID ${id}` });
  } catch (err) {
    console.error(`Lỗi khi xóa đơn hàng ${id}:`, err);
    res.status(500).json({ error: "Lỗi server nội bộ khi xóa đơn hàng" });
  }
});

// =======================================================
// 9. Logic Tác vụ Lập lịch (Cron Job) - Đã sửa lỗi SQL
// =======================================================
/**
 * Hàm thực thi logic cập nhật database tự động.
 */
const updateDatabaseTask = async () => {
  console.log("📅 Bắt đầu tác vụ lập lịch: Cập nhật database...");
  const client = await pool.connect(); // Lấy một kết nối từ pool

  try {
    await client.query("BEGIN"); // Bắt đầu transaction

    // --- Logic 1: Xóa đơn hàng hết hạn (< 0 ngày) ---
    const deleteResult = await client.query(
      `DELETE FROM mavryk.order_list
       WHERE (TO_DATE(het_han, 'DD/MM/YYYY') - CURRENT_DATE) < 0;` // <-- Sửa cú pháp ngày
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
           (TO_DATE(het_han, 'DD/MM/YYYY') - CURRENT_DATE) = 0
           AND tinh_trang != 'Đã Thanh Toán';` // <-- Sửa cú pháp ngày
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
           AND tinh_trang != 'Đã Thanh Toán';` // <-- Sửa cú pháp ngày
    );
    console.log(
      `   - Đã cập nhật ${updateSoonResult.rowCount} đơn hàng thành 'Chưa Thanh Toán' (<= 4 ngày).`
    );

    await client.query("COMMIT"); // Hoàn tất transaction thành công
    console.log("✅ Tác vụ lập lịch hoàn thành thành công.");
  } catch (error) {
    await client.query("ROLLBACK"); // Hoàn tác transaction nếu có lỗi
    console.error("❌ Lỗi khi chạy tác vụ lập lịch:", error);
    throw error; // Ném lỗi để API test bắt được
  } finally {
    client.release(); // Luôn trả kết nối về pool
  }
};

// =======================================================
// 10. API Test: Kích hoạt Tác vụ Lập lịch Thủ công
// =======================================================
app.get("/api/run-scheduler", async (req, res) => {
  console.log("--- ĐÃ KÍCH HOẠT CHẠY CRON JOB THỦ CÔNG ---");
  try {
    await updateDatabaseTask(); // Gọi hàm thực thi cron job
    res
      .status(200)
      .json({
        success: true,
        message: "Tác vụ lập lịch đã được kích hoạt thành công.",
      });
  } catch (error) {
    // Lỗi này xảy ra nếu có lỗi SQL bên trong updateDatabaseTask
    res
      .status(500)
      .json({ error: "Lỗi server nội bộ khi chạy tác vụ lập lịch." });
  }
});

// 11. Lên lịch chạy tác vụ (00:01 mỗi ngày)
cron.schedule("1 0 * * *", updateDatabaseTask, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh", // Đặt múi giờ của bạn
});
// =======================================================

// 12. Khởi động server
app.listen(port, () => {
  console.log(`Backend server đang chạy tại http://localhost:${port}`);
  console.log(
    "⏰ Cron job đã được lên lịch chạy hàng ngày vào 00:01 sáng (Asia/Ho_Chi_Minh)."
  );
});
