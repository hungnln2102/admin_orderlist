/**
 * Tạo bảng admin.ip_whitelist.
 * Chạy: node scripts/migrations/run-migration-018.js
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
  "018_create_admin_ip_whitelists.sql"
);

async function run() {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Migration 018 chạy xong: đã tạo bảng admin.ip_whitelist.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Lỗi chạy migration 018:", err);
  process.exit(1);
});
