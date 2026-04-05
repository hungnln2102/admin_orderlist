/**
 * Thêm cột product.variant.pct_stu (giá sinh viên giữa MAVC và MAVL).
 * Chạy: npm run migrate:027
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
  "027_variant_pct_stu.sql"
);

async function run() {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Migration 027 chạy xong: đã thêm product.variant.pct_stu.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Lỗi chạy migration 027:", err);
  process.exit(1);
});
