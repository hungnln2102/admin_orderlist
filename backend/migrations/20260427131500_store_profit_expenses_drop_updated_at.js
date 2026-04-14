/**
 * @see database/migrations/061_store_profit_expenses_drop_updated_at.sql
 */

const fs = require("fs");
const path = require("path");

exports.up = async function up(knex) {
  const sqlPath = path.join(
    __dirname,
    "..",
    "..",
    "database",
    "migrations",
    "061_store_profit_expenses_drop_updated_at.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down(knex) {
  await knex.raw(`
    ALTER TABLE finance.store_profit_expenses
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);
};
