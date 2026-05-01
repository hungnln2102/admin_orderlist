/**
 * Baseline migration.
 *
 * Fresh database: chạy snapshot DDL `database/migrations/000_consolidated_schema.sql`
 * (tạo `admin.users`, `orders`, v.v.).
 *
 * DB đã có schema `orders`: bỏ qua (coi như đã bootstrap), các migration sau ch runs bình thường.
 */

const fs = require("fs");
const path = require("path");

const CONSOLIDATED_SCHEMA = path.join(
  __dirname,
  "..",
  "..",
  "database",
  "migrations",
  "000_consolidated_schema.sql"
);

exports.up = async function up(knex) {
  const hasOrderSchema = await knex.raw(
    "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'orders'"
  );

  if (hasOrderSchema.rows.length) {
    return;
  }

  const sql = fs.readFileSync(CONSOLIDATED_SCHEMA, "utf8");
  await knex.raw(sql);
};

exports.down = async function down() {
  // Baseline migration is intentionally not reversible.
};
