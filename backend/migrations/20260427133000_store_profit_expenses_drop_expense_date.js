/**
 * @see database/migrations/062_store_profit_expenses_drop_expense_date.sql
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
    "062_store_profit_expenses_drop_expense_date.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await knex.raw(sql);
};

exports.down = async function down(knex) {
  await knex.raw(`
    ALTER TABLE finance.store_profit_expenses
      ADD COLUMN IF NOT EXISTS expense_date DATE NOT NULL DEFAULT CURRENT_DATE;
    UPDATE finance.store_profit_expenses
    SET expense_date = COALESCE(expense_date, DATE(created_at))
    WHERE expense_date IS NULL;
  `);
};
