/**
 * Cột total_import (tổng nhập hàng theo tháng từ partner.supplier_order_cost_log.import_cost).
 * Đồng bộ qua trigger; backfill từ log.
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

  await knex.raw(`
    ALTER TABLE "${fin}".dashboard_monthly_summary
    ADD COLUMN IF NOT EXISTS total_import NUMERIC(18,2) NOT NULL DEFAULT 0;
  `);

  await knex.raw(
    `
    UPDATE "${fin}".dashboard_monthly_summary d
    SET total_import = sub.s
    FROM (
      SELECT
        TO_CHAR(DATE_TRUNC('month', logged_at::timestamptz), 'YYYY-MM') AS mk,
        COALESCE(SUM(import_cost::numeric), 0) AS s
      FROM "${par}".supplier_order_cost_log
      WHERE logged_at IS NOT NULL
      GROUP BY 1
    ) sub
    WHERE d.month_key = sub.mk;
  `
  );

  await knex.raw(`
    CREATE OR REPLACE FUNCTION "${par}".fn_recalc_dashboard_total_import()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    DECLARE
      mks text[];
      mk text;
      v_sum numeric;
      r record;
    BEGIN
      mks := ARRAY[]::text[];
      IF TG_OP = 'DELETE' THEN
        IF OLD.logged_at IS NOT NULL THEN
          mks := array_append(mks, TO_CHAR(DATE_TRUNC('month', OLD.logged_at::timestamptz), 'YYYY-MM'));
        END IF;
      ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.logged_at IS NOT NULL THEN
          mks := array_append(mks, TO_CHAR(DATE_TRUNC('month', OLD.logged_at::timestamptz), 'YYYY-MM'));
        END IF;
        IF NEW.logged_at IS NOT NULL THEN
          mks := array_append(mks, TO_CHAR(DATE_TRUNC('month', NEW.logged_at::timestamptz), 'YYYY-MM'));
        END IF;
      ELSE
        IF NEW.logged_at IS NOT NULL THEN
          mks := array_append(mks, TO_CHAR(DATE_TRUNC('month', NEW.logged_at::timestamptz), 'YYYY-MM'));
        END IF;
      END IF;

      FOR r IN
        SELECT DISTINCT t.k AS k
        FROM unnest(mks) AS t(k)
        WHERE t.k IS NOT NULL AND t.k <> ''
      LOOP
        mk := r.k;
        SELECT COALESCE(SUM(import_cost::numeric), 0) INTO v_sum
        FROM "${par}".supplier_order_cost_log
        WHERE logged_at IS NOT NULL
          AND TO_CHAR(DATE_TRUNC('month', logged_at::timestamptz), 'YYYY-MM') = mk;

        EXECUTE format(
          'INSERT INTO %I.%I (month_key, total_import, updated_at) VALUES ($1, $2, now()) ON CONFLICT (month_key) DO UPDATE SET total_import = EXCLUDED.total_import, updated_at = now()',
          '${fin}',
          'dashboard_monthly_summary'
        ) USING mk, v_sum;
      END LOOP;
      RETURN COALESCE(NEW, OLD);
    END;
    $fn$;
  `);

  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_supplier_order_cost_log_dashboard_import ON "${par}".supplier_order_cost_log;
  `);
  await knex.raw(`
    CREATE TRIGGER trg_supplier_order_cost_log_dashboard_import
    AFTER INSERT OR UPDATE OR DELETE ON "${par}".supplier_order_cost_log
    FOR EACH ROW EXECUTE PROCEDURE "${par}".fn_recalc_dashboard_total_import();
  `);
};

exports.down = async function down(knex) {
  const fin = ident(financeSchema);
  const par = ident(partnerSchema);

  await knex.raw(
    `DROP TRIGGER IF EXISTS trg_supplier_order_cost_log_dashboard_import ON "${par}".supplier_order_cost_log;`
  );
  await knex.raw(`DROP FUNCTION IF EXISTS "${par}".fn_recalc_dashboard_total_import();`);
  await knex.raw(
    `ALTER TABLE "${fin}".dashboard_monthly_summary DROP COLUMN IF EXISTS total_import;`
  );
};
