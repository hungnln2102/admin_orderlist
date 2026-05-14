/**
 * Cột đếm đơn dashboard (mốc birth / canceled_at ≥ tax_from trong backfill).
 * @see database/migrations/098_daily_revenue_summary_dashboard_order_counts.sql
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
      ADD COLUMN IF NOT EXISTS dashboard_orders_count bigint NOT NULL DEFAULT 0;
    ALTER TABLE ${fin}.daily_revenue_summary
      ADD COLUMN IF NOT EXISTS dashboard_canceled_count bigint NOT NULL DEFAULT 0;
  `);
};

exports.down = async function down(knex) {
  const fin = ident(financeSchema);
  await knex.raw(`
    ALTER TABLE ${fin}.daily_revenue_summary DROP COLUMN IF EXISTS dashboard_canceled_count;
    ALTER TABLE ${fin}.daily_revenue_summary DROP COLUMN IF EXISTS dashboard_orders_count;
  `);
};
