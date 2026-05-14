/**
 * Cột linked_order_code + expense_meta (MAVN) — bản trước trỏ nhầm file SQL / schema `finance`;
 * môi trường thực tế dùng SCHEMA_FINANCE (vd. dashboard.store_profit_expenses).
 */
const { loadBackendEnv } = require("../src/config/loadEnv");

loadBackendEnv();

const pickSchema = (...c) => c.find(Boolean);

const financeSchema = pickSchema(
  process.env.DB_SCHEMA_FINANCE,
  process.env.SCHEMA_FINANCE,
  "dashboard"
);

const ident = (name) => {
  const s = String(name || "").trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return s;
};

exports.up = async function up(knex) {
  const fin = ident(financeSchema);
  await knex.raw(`
    ALTER TABLE "${fin}".store_profit_expenses
      DROP CONSTRAINT IF EXISTS store_profit_expenses_expense_type_check;
    ALTER TABLE "${fin}".store_profit_expenses
      ADD CONSTRAINT store_profit_expenses_expense_type_check
      CHECK (expense_type IN ('withdraw_profit', 'external_import', 'mavn_import'));
    ALTER TABLE "${fin}".store_profit_expenses
      ADD COLUMN IF NOT EXISTS linked_order_code VARCHAR(120),
      ADD COLUMN IF NOT EXISTS expense_meta JSONB;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_store_profit_expenses_mavn_order
      ON "${fin}".store_profit_expenses (linked_order_code)
      WHERE expense_type = 'mavn_import'
        AND linked_order_code IS NOT NULL
        AND btrim(linked_order_code::text) <> '';
  `);
};

exports.down = async function down(knex) {
  const fin = ident(financeSchema);
  await knex.raw(`
    DROP INDEX IF EXISTS "${fin}".uq_store_profit_expenses_mavn_order;
    ALTER TABLE "${fin}".store_profit_expenses DROP COLUMN IF EXISTS expense_meta;
    ALTER TABLE "${fin}".store_profit_expenses DROP COLUMN IF EXISTS linked_order_code;
    ALTER TABLE "${fin}".store_profit_expenses DROP CONSTRAINT IF EXISTS store_profit_expenses_expense_type_check;
    ALTER TABLE "${fin}".store_profit_expenses ADD CONSTRAINT store_profit_expenses_expense_type_check
      CHECK (expense_type IN ('withdraw_profit', 'external_import'));
  `);
};
