/**
 * Cột total_tax: round(total_revenue * DASHBOARD_MONTHLY_TAX_RATE_PERCENT / 100), khớp appConfig.
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

const parseTaxRate = () => {
  const raw = process.env.DASHBOARD_MONTHLY_TAX_RATE_PERCENT;
  if (raw === undefined || String(raw).trim() === "") return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
};

exports.up = async function up(knex) {
  const fin = ident(financeSchema);
  const rate = parseTaxRate();

  await knex.raw(`
    ALTER TABLE "${fin}".dashboard_monthly_summary
    ADD COLUMN IF NOT EXISTS total_tax NUMERIC(18,2) NOT NULL DEFAULT 0;
  `);

  await knex.raw(
    `UPDATE "${fin}".dashboard_monthly_summary
     SET total_tax = ROUND(COALESCE(total_revenue, 0)::numeric * ? / 100.0)`,
    [rate]
  );
};

exports.down = async function down(knex) {
  const fin = ident(financeSchema);
  await knex.raw(
    `ALTER TABLE "${fin}".dashboard_monthly_summary DROP COLUMN IF EXISTS total_tax;`
  );
};
