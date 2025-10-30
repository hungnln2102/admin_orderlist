// index.js (ĐÃ TÁCH LOGIC CRON JOB)

require("dotenv").config(); // Tải biến môi trường từ file .env
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
// const cron = require("node-cron"); // ĐÃ XÓA CRON
const updateDatabaseTask = require("./scheduler"); // <--- IMPORT TÁC VỤ TỪ FILE RIÊNG

const app = express();
const port = 3001;

// 1. Cấu hình CORS (Cho phép React gọi đến)
app.use(
  cors({
    origin: "http://localhost:5173", // Cổng React app của bạn
  })
);

// 2. Middleware để đọc JSON từ body
app.use(express.json());

// 3. Kết nối Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// =======================================================
// 4-8. API Endpoints (Giữ nguyên)
// =======================================================

// 4. GET /api/orders
app.get("/api/orders", async (req, res) => {
  console.log("Đã nhận yêu cầu GET /api/orders");
  try {
    const result = await pool.query("SELECT * FROM mavryk.order_list");
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi truy vấn database (GET):", err);
    res.status(500).json({ error: "Lỗi server nội bộ khi lấy đơn hàng" });
  }
});

// 5. POST /api/webhook/payment
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

// 6. GET /api/orders/:id
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

// 7. PUT /api/orders/:id
app.put("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  const orderData = req.body;
  console.log(`Đã nhận yêu cầu PUT /api/orders/${id}`);

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

// 8. DELETE /api/orders/:id
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
// 9. API Test: Kích hoạt Tác vụ Lập lịch Thủ công
// =======================================================
app.get("/api/run-scheduler", async (req, res) => {
  console.log("--- ĐÃ KÍCH HOẠT CHẠY CRON JOB THỦ CÔNG ---");
  try {
    // Gọi hàm được export từ scheduler.js
    await updateDatabaseTask();
    res.status(200).json({
      success: true,
      message: "Tác vụ lập lịch đã được kích hoạt thành công.",
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Lỗi server nội bộ khi chạy tác vụ lập lịch." });
  }
});

// 10. Khởi động server
app.listen(port, () => {
  console.log(`Backend server đang chạy tại http://localhost:${port}`);
  console.log(
    "⏰ Tác vụ lập lịch (cron job) đang chạy ở file scheduler.js riêng biệt."
  );
});
