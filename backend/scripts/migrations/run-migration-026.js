/**
 * Xóa bảng Google Family (system_automation + legacy system_google_family).
 * Chạy: npm run migrate:026
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
  "026_drop_google_family_tables.sql"
);

async function run() {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Migration 026 chạy xong: đã gỡ Google Family khỏi database.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Lỗi chạy migration 026:", err);
  process.exit(1);
});
