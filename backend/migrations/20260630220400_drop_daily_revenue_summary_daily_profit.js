/**
 * Bỏ cột daily_profit (trùng allocated_profit_tax).
 * @see database/migrations/097_drop_daily_revenue_summary_daily_profit.sql
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
  return `"${s}"`;
};

exports.up = async function up(knex) {
  const fin = ident(financeSchema);
  await knex.raw(
    `ALTER TABLE ${fin}.daily_revenue_summary DROP COLUMN IF EXISTS daily_profit;`
  );
};

exports.down = async function down(knex) {
  const fin = ident(financeSchema);
  await knex.raw(`
    ALTER TABLE ${fin}.daily_revenue_summary
      ADD COLUMN IF NOT EXISTS daily_profit numeric(18,2) NOT NULL DEFAULT 0;
  `);
  await knex.raw(`
    UPDATE ${fin}.daily_revenue_summary
    SET daily_profit = allocated_profit_tax;
  `);
};
