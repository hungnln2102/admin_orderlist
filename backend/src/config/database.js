const { Pool } = require("pg");
require("dotenv").config();

// Cấu hình pool kết nối
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Các cấu hình tối ưu cho production sau này
  max: 20, // Tối đa 20 kết nối cùng lúc
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Kiểm tra kết nối khi khởi động
pool.connect((err, client, release) => {
  if (err) {
    return console.error("❌ Lỗi kết nối Database:", err.stack);
  }
  client.query("SELECT NOW()", (err, result) => {
    release();
    if (err) {
      return console.error("❌ Lỗi chạy query test:", err.stack);
    }
    console.log("✅ Kết nối Database thành công:", result.rows[0].now);
  });
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
