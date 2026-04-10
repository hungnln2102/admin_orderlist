const { Pool } = require("pg");
require("dotenv").config();

const isProd = process.env.NODE_ENV === "production";

const RAW_POOL_MAX = Number(process.env.DB_RAW_POOL_MAX) || 5;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: RAW_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Lỗi kết nối Database:", err.stack);
    if (isProd) process.exit(1);
    return;
  }
  client.query("SELECT NOW()", (queryErr, result) => {
    release();
    if (queryErr) {
      console.error("❌ Lỗi chạy query test:", queryErr.stack);
      if (isProd) process.exit(1);
      return;
    }
    console.log(
      `✅ Kết nối Database thành công (raw pool max=${RAW_POOL_MAX}):`,
      result.rows[0].now
    );
  });
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
