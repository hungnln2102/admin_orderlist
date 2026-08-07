exports.up = async function (knex) {
  // Sửa trigger function fn_recalc_dashboard_total_import thành NOOP
  await knex.raw(`
    CREATE OR REPLACE FUNCTION business.fn_recalc_dashboard_total_import()
     RETURNS trigger
     LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN COALESCE(NEW, OLD);
    END;
    $$;
  `);
};

exports.down = async function (knex) {
  // Đảo ngược lại logic trigger function fn_recalc_dashboard_total_import nguyên bản (tính tổng và ghi vào view)
  // Thực tế vì dashboard_monthly_summary là VIEW nên logic này sẽ lỗi, nhưng ta giữ để hoàn thành rollback signature
  await knex.raw(`
    CREATE OR REPLACE FUNCTION business.fn_recalc_dashboard_total_import()
     RETURNS trigger
     LANGUAGE plpgsql
    AS $$
        DECLARE
          mks text[];
          mk text;
          v_sum numeric;
          r record;
        BEGIN
          mks := ARRAY[]::text[];
          IF TG_OP = 'DELETE' THEN
            IF OLD.logged_at IS NOT NULL THEN
              mks := array_append(mks, TO_CHAR(timezone('Asia/Ho_Chi_Minh', OLD.logged_at), 'YYYY-MM'));
            END IF;
          ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.logged_at IS NOT NULL THEN
              mks := array_append(mks, TO_CHAR(timezone('Asia/Ho_Chi_Minh', OLD.logged_at), 'YYYY-MM'));
            END IF;
            IF NEW.logged_at IS NOT NULL THEN
              mks := array_append(mks, TO_CHAR(timezone('Asia/Ho_Chi_Minh', NEW.logged_at), 'YYYY-MM'));
            END IF;
          ELSE
            IF NEW.logged_at IS NOT NULL THEN
              mks := array_append(mks, TO_CHAR(timezone('Asia/Ho_Chi_Minh', NEW.logged_at), 'YYYY-MM'));
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
              FROM "business".supplier_order_cost_log l
              WHERE l.logged_at IS NOT NULL
                AND TO_CHAR(timezone('Asia/Ho_Chi_Minh', l.logged_at), 'YYYY-MM') = mk
              ORDER BY l.order_list_id, l.id DESC
            ) sub;

            EXECUTE format(
              'INSERT INTO %I.%I (month_key, total_import, updated_at) VALUES ($1, $2, now()) ON CONFLICT (month_key) DO UPDATE SET total_import = EXCLUDED.total_import, updated_at = now()',
              'finance',
              'dashboard_monthly_summary'
            ) USING mk, v_sum;
          END LOOP;
          RETURN COALESCE(NEW, OLD);
        END;
        $$;
  `);
};
