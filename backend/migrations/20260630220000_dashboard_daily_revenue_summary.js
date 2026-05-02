/**
 * Bảng dashboard.daily_revenue_summary — snapshot doanh thu theo ngày (earned / unearned cuối ngày / đảo chiều).
 * @see database/migrations/093_dashboard_daily_revenue_summary.sql
 */

const fs = require("fs");
const path = require("path");
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
  const sqlPath = path.join(
    __dirname,
    "..",
    "..",
    "database",
    "migrations",
    "093_dashboard_daily_revenue_summary.sql"
  );
  await knex.raw(fs.readFileSync(sqlPath, "utf8"));
};

exports.down = async function down(knex) {
  const fin = ident(financeSchema);
  await knex.raw(
    `DROP TABLE IF EXISTS "${fin}".daily_revenue_summary CASCADE;`
  );
};
