/**
 * Chạy migration 014 (drop schema key_active) bằng pg.
 * Chạy: node scripts/run-migration-014.js (từ thư mục backend)
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
  "014_drop_key_active_schema.sql"
);

async function run() {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Migration 014 chạy xong: đã xóa schema key_active (order_auto_keys, systems).");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
