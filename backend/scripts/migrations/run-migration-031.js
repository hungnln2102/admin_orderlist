/**
 * Bổ sung cột hero cho content.banners (title, mô tả, tag, alt, CTA tùy chọn).
 * Chạy: npm run migrate:031
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
  "031_banners_hero_full.sql"
);

async function run() {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log("Migration 031 xong: content.banners đã có đủ trường hero + CTA tùy chọn.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Lỗi chạy migration 031:", err);
  process.exit(1);
});
