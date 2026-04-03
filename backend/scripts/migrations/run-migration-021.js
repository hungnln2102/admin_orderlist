/**
 * Bỏ cột title, link_url khỏi content.banners (chỉ ảnh tĩnh).
 * Chạy: node scripts/migrations/run-migration-021.js
 * Hoặc: npm run migrate:021
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
  "021_banners_image_only.sql"
);

async function run() {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log(
      "Migration 021 chạy xong: content.banners chỉ còn image_url (đã bỏ title, link_url)."
    );
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Lỗi chạy migration 021:", err);
  process.exit(1);
});
