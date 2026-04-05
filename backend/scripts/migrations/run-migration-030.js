/**
 * Gỡ FK variant.id_desc → desc_variant, cho NULL toàn bộ id_desc, TRUNCATE desc_variant.
 * Dùng khi muốn variant không còn “match” bảng desc_variant (dữ liệu mô tả tạo sau).
 * Chạy: npm run migrate:030
 */
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const { Client } = require("pg");

const migrationPath = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "database",
  "migrations",
  "030_variant_id_desc_detach.sql"
);

async function run() {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log(
      "Migration 030 xong: variant.id_desc = NULL (nullable), FK đã gỡ, desc_variant đã TRUNCATE."
    );
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Lỗi chạy migration 030:", err);
  process.exit(1);
});
