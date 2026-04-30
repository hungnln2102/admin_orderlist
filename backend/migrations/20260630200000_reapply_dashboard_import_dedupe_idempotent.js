/**
 * Knex **không** chạy lại migration đã ghi trong `knex_migrations` — sửa file cũ không có tác dụng.
 * File này là bản **áp dụng lại idempotent** (CREATE OR REPLACE + backfill) khi cần đồng bộ DB
 * sau khi chỉnh SQL trong migration trước (301500/301501) hoặc triển khai nhánh chưa chạy đủ.
 *
 * An toàn chạy nhiều lần: ghi đè function + tính lại total_import theo đúng công thức hiện tại.
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
        SELECT COALESCE(SUM(sub.import_cost::numeric), 0) INTO v_sum
        FROM (
          SELECT DISTINCT ON (l.order_list_id)
            l.import_cost
          FROM "${par}".supplier_order_cost_log l
          WHERE l.logged_at IS NOT NULL
            AND TO_CHAR(DATE_TRUNC('month', l.logged_at::timestamptz), 'YYYY-MM') = mk
          ORDER BY l.order_list_id, l.id DESC
        ) sub;

        EXECUTE format(
          'INSERT INTO %I.%I (month_key, total_import, updated_at) VALUES ($1, $2, now()) ON CONFLICT (month_key) DO UPDATE SET total_import = EXCLUDED.total_import, updated_at = now()',
          '${fin}',
          'dashboard_monthly_summary'
        ) USING mk, v_sum;
      END LOOP;
      RETURN COALESCE(NEW, OLD);
    END;
    $fn$;
  `
  );

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
  /* no-op */
};
