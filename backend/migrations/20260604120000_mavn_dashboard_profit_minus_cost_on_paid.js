/**
 * Đơn MAVN khi PAID: total_profit (dashboard_monthly_summary) giảm theo đúng cost.
 * Trước đây GREATEST(0, price - cost) với price=0 → 0, không phản ánh giá nhập.
 *
 * Tháng ghi nhận −cost: theo MONTH(supplier_order_cost_log.logged_at) — mốc DEFAULT NOW()
 * lúc INSERT log khi đơn chuyển Đã TT. Migration 087 giữ logged_at khi sửa cost (MAVN),
 * tránh kéo chỉ số sang tháng sau.
 * @see fn_recalc_dashboard_total_import (partner.supplier_order_cost_log trigger)
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
const ordersSchema = pickSchema(
  process.env.DB_SCHEMA_ORDERS,
  process.env.SCHEMA_ORDERS,
  "orders"
);

const ident = (name) => {
  const s = String(name || "").trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return s;
};

/** Cùng logic với migration 20260602120000, thêm nhánh MAVN+PAID → -cost. */
const marginFromOrderList = (olAlias) => `
CASE
  WHEN UPPER(TRIM(COALESCE(${olAlias}.id_order::text, ''))) LIKE 'MAVN%'
       AND TRIM(COALESCE(${olAlias}.status::text, '')) = 'Đã Thanh Toán' THEN
    - COALESCE(${olAlias}.cost::numeric, 0)
  ELSE GREATEST(
    0,
    COALESCE(${olAlias}.gross_selling_price::numeric, ${olAlias}.price::numeric, 0)
      - COALESCE(${olAlias}.cost::numeric, 0)
  )
END
`;

exports.up = async function up(knex) {
  const fin = ident(financeSchema);
  const par = ident(partnerSchema);
  const ord = ident(ordersSchema);

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
      v_profit numeric;
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

        SELECT COALESCE(SUM(m), 0) INTO v_profit
        FROM (
          SELECT DISTINCT ON (l.order_list_id)
            ${marginFromOrderList("ol")} AS m
          FROM "${par}".supplier_order_cost_log l
          INNER JOIN "${ord}".order_list ol ON ol.id = l.order_list_id
          WHERE l.logged_at IS NOT NULL
            AND TO_CHAR(DATE_TRUNC('month', l.logged_at::timestamptz), 'YYYY-MM') = mk
          ORDER BY l.order_list_id, l.id DESC
        ) sub;

        EXECUTE format(
          'INSERT INTO %I.%I (month_key, total_import, total_profit, updated_at) VALUES ($1, $2, $3, now()) ON CONFLICT (month_key) DO UPDATE SET total_import = EXCLUDED.total_import, total_profit = EXCLUDED.total_profit, updated_at = now()',
          '${fin}',
          'dashboard_monthly_summary'
        ) USING mk, v_sum, v_profit;
      END LOOP;
      RETURN COALESCE(NEW, OLD);
    END;
    $fn$;
  `
  );

  await knex.raw(
    `
    UPDATE "${fin}".dashboard_monthly_summary d
    SET total_profit = sub.p
    FROM (
      SELECT
        x.mk,
        COALESCE(SUM(x.m), 0) AS p
      FROM (
        SELECT DISTINCT ON (
          TO_CHAR(DATE_TRUNC('month', l.logged_at::timestamptz), 'YYYY-MM'),
          l.order_list_id
        )
          TO_CHAR(DATE_TRUNC('month', l.logged_at::timestamptz), 'YYYY-MM') AS mk,
          ${marginFromOrderList("ol")} AS m
        FROM "${par}".supplier_order_cost_log l
        INNER JOIN "${ord}".order_list ol ON ol.id = l.order_list_id
        WHERE l.logged_at IS NOT NULL
        ORDER BY
          TO_CHAR(DATE_TRUNC('month', l.logged_at::timestamptz), 'YYYY-MM'),
          l.order_list_id,
          l.id DESC
      ) x
      GROUP BY x.mk
    ) sub
    WHERE d.month_key = sub.mk;
  `
  );
};

exports.down = async function down(knex) {
  const fin = ident(financeSchema);
  const par = ident(partnerSchema);
  const ord = ident(ordersSchema);

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
      v_profit numeric;
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

        SELECT COALESCE(SUM(m), 0) INTO v_profit
        FROM (
          SELECT DISTINCT ON (l.order_list_id)
            GREATEST(
              0,
              COALESCE(ol.gross_selling_price::numeric, ol.price::numeric, 0)
                - COALESCE(ol.cost::numeric, 0)
            ) AS m
          FROM "${par}".supplier_order_cost_log l
          INNER JOIN "${ord}".order_list ol ON ol.id = l.order_list_id
          WHERE l.logged_at IS NOT NULL
            AND TO_CHAR(DATE_TRUNC('month', l.logged_at::timestamptz), 'YYYY-MM') = mk
          ORDER BY l.order_list_id, l.id DESC
        ) sub;

        EXECUTE format(
          'INSERT INTO %I.%I (month_key, total_import, total_profit, updated_at) VALUES ($1, $2, $3, now()) ON CONFLICT (month_key) DO UPDATE SET total_import = EXCLUDED.total_import, total_profit = EXCLUDED.total_profit, updated_at = now()',
          '${fin}',
          'dashboard_monthly_summary'
        ) USING mk, v_sum, v_profit;
      END LOOP;
      RETURN COALESCE(NEW, OLD);
    END;
    $fn$;
  `
  );

  await knex.raw(
    `
    UPDATE "${fin}".dashboard_monthly_summary d
    SET total_profit = sub.p
    FROM (
      SELECT
        x.mk,
        COALESCE(SUM(x.m), 0) AS p
      FROM (
        SELECT DISTINCT ON (
          TO_CHAR(DATE_TRUNC('month', l.logged_at::timestamptz), 'YYYY-MM'),
          l.order_list_id
        )
          TO_CHAR(DATE_TRUNC('month', l.logged_at::timestamptz), 'YYYY-MM') AS mk,
          GREATEST(
            0,
            COALESCE(ol.gross_selling_price::numeric, ol.price::numeric, 0)
              - COALESCE(ol.cost::numeric, 0)
          ) AS m
        FROM "${par}".supplier_order_cost_log l
        INNER JOIN "${ord}".order_list ol ON ol.id = l.order_list_id
        WHERE l.logged_at IS NOT NULL
        ORDER BY
          TO_CHAR(DATE_TRUNC('month', l.logged_at::timestamptz), 'YYYY-MM'),
          l.order_list_id,
          l.id DESC
      ) x
      GROUP BY x.mk
    ) sub
    WHERE d.month_key = sub.mk;
  `
  );
};
