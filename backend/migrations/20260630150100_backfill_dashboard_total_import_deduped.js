/**
 * Backfill `dashboard_monthly_summary.total_import` theo cùng công thức DISTINCT ON
 * như `fn_recalc_dashboard_total_import` (migration 20260630150000).
 */
const { loadBackendEnv } = require("../src/config/loadEnv");

loadBackendEnv();

const pickSchema = (...c) => c.find(Boolean);

const financeSchema = pickSchema(
  process.env.DB_SCHEMA_FINANCE,
  process.env.SCHEMA_FINANCE,
  "dashboard"
);
const partnerSchema = pickSchema(
  process.env.DB_SCHEMA_PARTNER,
  process.env.SCHEMA_PARTNER,
  "partner"
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
  const par = ident(partnerSchema);

  await knex.raw(
    `
    WITH ranked AS (
      SELECT
        TO_CHAR(DATE_TRUNC('month', l.logged_at::timestamptz), 'YYYY-MM') AS mk,
        l.import_cost,
        ROW_NUMBER() OVER (
          PARTITION BY TO_CHAR(DATE_TRUNC('month', l.logged_at::timestamptz), 'YYYY-MM'), l.order_list_id
          ORDER BY l.id DESC
        ) AS rn
      FROM "${par}".supplier_order_cost_log l
      WHERE l.logged_at IS NOT NULL
    ),
    agg AS (
      SELECT mk, COALESCE(SUM(import_cost::numeric), 0) AS s
      FROM ranked
      WHERE rn = 1
      GROUP BY mk
    )
    UPDATE "${fin}".dashboard_monthly_summary d
    SET total_import = agg.s,
        updated_at = now()
    FROM agg
    WHERE d.month_key = agg.mk
    `
  );
};

exports.down = async function down() {
  /* no-op: không khôi phục số cũ */
};
