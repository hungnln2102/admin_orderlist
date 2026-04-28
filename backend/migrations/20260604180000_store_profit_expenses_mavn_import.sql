/**
 * MAVN chi phí: cột expense_type mavn_import, linked_order_code + expense_meta JSON.
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
    "088_store_profit_expenses_mavn_import.sql"
  );
  await knex.raw(fs.readFileSync(sqlPath, "utf8"));
};

exports.down = async function down(knex) {
  await knex.raw(`
    DROP INDEX IF EXISTS finance.uq_store_profit_expenses_mavn_order;
    ALTER TABLE finance.store_profit_expenses DROP COLUMN IF EXISTS expense_meta;
    ALTER TABLE finance.store_profit_expenses DROP COLUMN IF EXISTS linked_order_code;
    ALTER TABLE finance.store_profit_expenses DROP CONSTRAINT IF EXISTS store_profit_expenses_expense_type_check;
    ALTER TABLE finance.store_profit_expenses ADD CONSTRAINT store_profit_expenses_expense_type_check
      CHECK (expense_type IN ('withdraw_profit', 'external_import'));
  `);
};
