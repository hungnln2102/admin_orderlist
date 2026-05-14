/**
 * `total_import` theo tháng: bucket `logged_at` theo lịch **Asia/Ho_Chi_Minh**
 * (khớp `paidMonthKey` từ `payment_receipt.payment_date` — ngày lịch VN).
 * Tránh lệch với `DATE_TRUNC(..., timestamptz)` theo session UTC gây: ledger một tháng, app += tháng khác → “double” khi gộp KPI / hai lần cùng khoản.
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

/** Cùng biểu thức Knex nhét vào PL/pgSQL và backfill CTE. */
const monthKeyFromLoggedAtSql = (col) =>
  `TO_CHAR(timezone('Asia/Ho_Chi_Minh', ${col}), 'YYYY-MM')`;

exports.up = async function up(knex) {
  const fin = ident(financeSchema);
  const par = ident(partnerSchema);
  const mkOld = monthKeyFromLoggedAtSql("OLD.logged_at");
  const mkNew = monthKeyFromLoggedAtSql("NEW.logged_at");
  const mkL = monthKeyFromLoggedAtSql("l.logged_at");

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
          mks := array_append(mks, ${mkOld});
        END IF;
      ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.logged_at IS NOT NULL THEN
          mks := array_append(mks, ${mkOld});
        END IF;
        IF NEW.logged_at IS NOT NULL THEN
          mks := array_append(mks, ${mkNew});
        END IF;
      ELSE
        IF NEW.logged_at IS NOT NULL THEN
          mks := array_append(mks, ${mkNew});
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
            AND ${mkL} = mk
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
        ${monthKeyFromLoggedAtSql("l.logged_at")} AS mk,
        l.import_cost,
        ROW_NUMBER() OVER (
          PARTITION BY ${monthKeyFromLoggedAtSql("l.logged_at")}, l.order_list_id
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

exports.down = function down() {
  /* no-op */
};
