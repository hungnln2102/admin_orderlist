/**
 * Add estimated bank balance flow columns:
 * - dashboard_monthly_summary.estimated_bank_balance
 * - dashboard_financial_change_log.bank_balance_delta
 * - dashboard_financial_change_log.bank_balance_snapshot
 */
const { loadBackendEnv } = require("../src/config/loadEnv");

loadBackendEnv();

const pickSchema = (...candidates) => candidates.find(Boolean);

const ident = (name) => {
  const s = String(name || "").trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return `"${s}"`;
};

exports.up = async function up(knex) {
  const fin = ident(
    pickSchema(process.env.DB_SCHEMA_FINANCE, process.env.SCHEMA_FINANCE, "dashboard")
  );

  await knex.raw(`
    ALTER TABLE ${fin}.dashboard_monthly_summary
      ADD COLUMN IF NOT EXISTS estimated_bank_balance NUMERIC(18,2) NOT NULL DEFAULT 0;

    ALTER TABLE ${fin}.dashboard_financial_change_log
      ADD COLUMN IF NOT EXISTS bank_balance_delta NUMERIC(18,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS bank_balance_snapshot NUMERIC(18,2) NOT NULL DEFAULT 0;
  `);
};

exports.down = async function down(knex) {
  const fin = ident(
    pickSchema(process.env.DB_SCHEMA_FINANCE, process.env.SCHEMA_FINANCE, "dashboard")
  );

  await knex.raw(`
    ALTER TABLE ${fin}.dashboard_financial_change_log
      DROP COLUMN IF EXISTS bank_balance_snapshot,
      DROP COLUMN IF EXISTS bank_balance_delta;

    ALTER TABLE ${fin}.dashboard_monthly_summary
      DROP COLUMN IF EXISTS estimated_bank_balance;
  `);
};
