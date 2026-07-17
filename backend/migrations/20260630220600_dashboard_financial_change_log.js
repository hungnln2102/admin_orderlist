/**
 * Log biến động tài chính dashboard theo tháng (append-only).
 * @see database/migrations/099_dashboard_financial_change_log.sql
 */

const { loadBackendEnv } = require("@/config/loadEnv");

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
    CREATE TABLE IF NOT EXISTS ${fin}.dashboard_financial_change_log (
      id bigserial PRIMARY KEY,
      month_key text NOT NULL,
      revenue_delta numeric(18,2) NOT NULL DEFAULT 0,
      profit_delta numeric(18,2) NOT NULL DEFAULT 0,
      import_delta numeric(18,2) NOT NULL DEFAULT 0,
      refund_delta numeric(18,2) NOT NULL DEFAULT 0,
      off_flow_delta numeric(18,2) NOT NULL DEFAULT 0,
      tax_snapshot numeric(18,2) NOT NULL DEFAULT 0,
      off_flow_snapshot numeric(18,2) NOT NULL DEFAULT 0,
      available_profit_snapshot numeric(18,2) NOT NULL DEFAULT 0,
      context text NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_dashboard_fin_change_log_month_created
      ON ${fin}.dashboard_financial_change_log (month_key, created_at DESC);
  `);
};

exports.down = async function down(knex) {
  const fin = ident(financeSchema);
  await knex.raw(`
    DROP TABLE IF EXISTS ${fin}.dashboard_financial_change_log;
  `);
};
