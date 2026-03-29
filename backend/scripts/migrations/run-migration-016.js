/**
 * Xóa bảng finance.dashboard_monthly_summary.
 * Chạy: node scripts/run-migration-016.js
 */
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { Client } = require("pg");

const migrationPath = path.join(
  __dirname,
  "..",
  "..",
  "database",
  "migrations",
  "016_drop_dashboard_monthly_summary.sql"
);

async function run() {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Migration 016 chạy xong: đã xóa finance.dashboard_monthly_summary nếu tồn tại.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});