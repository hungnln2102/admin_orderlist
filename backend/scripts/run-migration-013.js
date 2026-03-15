/**
 * Chạy migration 013 (rename schema + create product_system) bằng pg.
 * Chạy: node scripts/run-migration-013.js (từ thư mục backend)
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
  "013_rename_schema_to_system_automation_and_create_product_system.sql"
);

async function run() {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Migration 013 chạy xong: schema system_automation + bảng product_system.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
