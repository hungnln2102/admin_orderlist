/**
 * Cột total_shop_cost trên {SCHEMA_FINANCE}.daily_revenue_summary.
 * @see database/migrations/094_daily_revenue_summary_total_shop_cost.sql
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
  await knex.raw(`
    ALTER TABLE ${fin}.daily_revenue_summary
      ADD COLUMN IF NOT EXISTS total_shop_cost numeric(18,2) NOT NULL DEFAULT 0;
  `);
};

exports.down = async function down(knex) {
  const fin = ident(financeSchema);
  await knex.raw(
    `ALTER TABLE ${fin}.daily_revenue_summary DROP COLUMN IF EXISTS total_shop_cost;`
  );
};
