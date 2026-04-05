/**
 * Xóa nội dung text/ảnh trên product.desc_variant (các id đang được variant.id_desc dùng).
 * Không đụng cột id_desc trên variant.
 * Chạy: npm run migrate:029
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
  "029_clear_variant_desc_content.sql"
);

async function run() {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(sql);
    console.log(
      `Migration 029 xong: đã cập nhật ${res.rowCount ?? 0} bản ghi desc_variant (đặt rules/description/short_desc/image_url = NULL).`
    );
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Lỗi chạy migration 029:", err);
  process.exit(1);
});
