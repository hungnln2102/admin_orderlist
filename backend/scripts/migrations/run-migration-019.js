/**
 * Tạo bảng admin.site_settings.
 * Chạy: node scripts/migrations/run-migration-019.js
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
  "019_create_admin_site_settings.sql"
);

async function run() {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Migration 019 chạy xong: đã tạo bảng admin.site_settings.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Lỗi chạy migration 019:", err);
  process.exit(1);
});
