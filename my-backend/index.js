require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
const port = 3001; // Cổng cho backend

// 1. Cấu hình CORS
// Cho phép React app (chạy ở port 3000) gọi đến server này
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// 2. Kết nối Database
// Tự động đọc DATABASE_URL từ file .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 3. Tạo API endpoint
app.get("/api/orders", async (req, res) => {
  console.log("Đã nhận yêu cầu /api/orders"); // Thêm log để kiểm tra
  try {
    // Sửa tên bảng thành "order_list"
    const result = await pool.query("SELECT * FROM mavryk.order_list");

    // 4. Trả dữ liệu (dạng JSON)
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi truy vấn database:", err);
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
});

// 5. Khởi động server
app.listen(port, () => {
  console.log(`Backend server đang chạy tại http://localhost:${port}`);
});
