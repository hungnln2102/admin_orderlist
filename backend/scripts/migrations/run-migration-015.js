/**
 * Chạy migration 015 cho finance.dashboard_monthly_summary.
 * Chạy: node scripts/run-migration-015.js
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
  "015_fix_dashboard_monthly_summary_month_key.sql"
);

async function run() {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log(
      "Migration 015 chạy xong: month_key của finance.dashboard_monthly_summary đã dùng dạng YYYY-MM."
    );
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
