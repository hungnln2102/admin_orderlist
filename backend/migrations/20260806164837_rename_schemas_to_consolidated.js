exports.up = async function (knex) {
  // 1. Tạo 3 schema mới
  await knex.raw(`
    CREATE SCHEMA IF NOT EXISTS billing;
    CREATE SCHEMA IF NOT EXISTS finance;
    CREATE SCHEMA IF NOT EXISTS business;
  `);

  // 2. Xóa các view và materialized view tham chiếu cũ
  await knex.raw(`
    DROP VIEW IF EXISTS orders.v_payment_slot_health CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS product.variant_sold_count CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS product.product_sold_30d CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS product.product_sold_count CASCADE;
  `);

  // 3. Xóa các trigger cũ liên kết trên các bảng cũ
  await knex.raw(`
    DROP TRIGGER IF EXISTS tr_order_list_refund_force_positive ON orders.order_list;
    DROP TRIGGER IF EXISTS tr_supplier_order_cost_log_order_success ON orders.order_list;
    DROP TRIGGER IF EXISTS tr_supplier_order_cost_log_refund_note_only ON partner.supplier_order_cost_log;
    DROP TRIGGER IF EXISTS trg_supplier_order_cost_log_dashboard_import ON partner.supplier_order_cost_log;
    DROP TRIGGER IF EXISTS tr_refund_credit_applications_after_change ON receipt.refund_credit_applications;
    DROP TRIGGER IF EXISTS tr_refund_credit_notes_touch_updated_at ON receipt.refund_credit_notes;
    DROP TRIGGER IF EXISTS tr_touch_payment_receipt_batch_updated_at ON receipt.payment_receipt_batch;
    DROP TRIGGER IF EXISTS tr_order_list_keys_sync_order ON orders.order_list;
    DROP TRIGGER IF EXISTS tr_order_list_keys_bi_enforce ON system_automation.order_list_keys;
  `);

  // 4. Xóa các trigger function cũ trong các schema cũ
  await knex.raw(`
    DROP FUNCTION IF EXISTS orders.fn_order_list_refund_force_positive();
    DROP FUNCTION IF EXISTS partner.fn_recalc_dashboard_total_import();
    DROP FUNCTION IF EXISTS partner.fn_supplier_order_cost_log_on_success();
    DROP FUNCTION IF EXISTS partner.fn_supplier_order_cost_log_refund_note_only();
    DROP FUNCTION IF EXISTS product.refresh_product_sold_30d();
    DROP FUNCTION IF EXISTS product.refresh_sales_summary(integer);
    DROP FUNCTION IF EXISTS product.refresh_variant_sold_count();
    DROP FUNCTION IF EXISTS receipt.fn_recompute_refund_credit_note_balance(bigint);
    DROP FUNCTION IF EXISTS receipt.fn_refund_credit_applications_after_change();
    DROP FUNCTION IF EXISTS receipt.fn_refund_credit_notes_touch_updated_at();
    DROP FUNCTION IF EXISTS receipt.fn_touch_payment_receipt_batch_updated_at();
  `);

  // 5. Di chuyển các bảng sang schema mới
  const tablesToMove = [
    // admin -> finance
    { oldSchema: 'admin', newSchema: 'finance', table: 'ip_whitelist' },
    { oldSchema: 'admin', newSchema: 'finance', table: 'shop_bank_account_ledger' },
    { oldSchema: 'admin', newSchema: 'finance', table: 'shop_bank_accounts' },
    { oldSchema: 'admin', newSchema: 'finance', table: 'site_settings' },
    { oldSchema: 'admin', newSchema: 'finance', table: 'usdt_wallet_ledger' },
    { oldSchema: 'admin', newSchema: 'finance', table: 'usdt_wallets' },
    { oldSchema: 'admin', newSchema: 'finance', table: 'users' },
    // admin_finance -> finance
    { oldSchema: 'admin_finance', newSchema: 'finance', table: 'financial_allocation_ledger' },
    // dashboard -> finance
    { oldSchema: 'dashboard', newSchema: 'finance', table: 'daily_revenue_summary' },
    { oldSchema: 'dashboard', newSchema: 'finance', table: 'dashboard_financial_change_log' },
    { oldSchema: 'dashboard', newSchema: 'finance', table: 'dashboard_monthly_summary' },
    { oldSchema: 'dashboard', newSchema: 'finance', table: 'store_profit_expenses' },
    { oldSchema: 'dashboard', newSchema: 'finance', table: 'trans_dailybalances' },
    { oldSchema: 'dashboard', newSchema: 'finance', table: 'master_wallettypes' },
    { oldSchema: 'dashboard', newSchema: 'finance', table: 'saving_goals' },
    // orders -> business
    { oldSchema: 'orders', newSchema: 'business', table: 'order_customer' },
    { oldSchema: 'orders', newSchema: 'business', table: 'order_list' },
    { oldSchema: 'orders', newSchema: 'business', table: 'order_payment_slots' },
    // partner -> business
    { oldSchema: 'partner', newSchema: 'business', table: 'supplier' },
    { oldSchema: 'partner', newSchema: 'business', table: 'supplier_order_cost_log' },
    { oldSchema: 'partner', newSchema: 'business', table: 'supplier_payments' },
    // product -> business
    { oldSchema: 'product', newSchema: 'business', table: 'category' },
    { oldSchema: 'product', newSchema: 'business', table: 'desc_variant' },
    { oldSchema: 'product', newSchema: 'business', table: 'import_package_rules' },
    { oldSchema: 'product', newSchema: 'business', table: 'package_product' },
    { oldSchema: 'product', newSchema: 'business', table: 'pricing_tier' },
    { oldSchema: 'product', newSchema: 'business', table: 'product' },
    { oldSchema: 'product', newSchema: 'business', table: 'product_category' },
    { oldSchema: 'product', newSchema: 'business', table: 'productid_payment' },
    { oldSchema: 'product', newSchema: 'business', table: 'reviews' },
    { oldSchema: 'product', newSchema: 'business', table: 'supplier_cost' },
    { oldSchema: 'product', newSchema: 'business', table: 'variant' },
    { oldSchema: 'product', newSchema: 'business', table: 'variant_price' },
    { oldSchema: 'product', newSchema: 'business', table: 'variant_sales_summary' },
    // promotion -> business
    { oldSchema: 'promotion', newSchema: 'business', table: 'account_promotions' },
    { oldSchema: 'promotion', newSchema: 'business', table: 'promotion_codes' },
    // receipt -> billing
    { oldSchema: 'receipt', newSchema: 'billing', table: 'payment_receipt' },
    { oldSchema: 'receipt', newSchema: 'billing', table: 'payment_receipt_batch' },
    { oldSchema: 'receipt', newSchema: 'billing', table: 'payment_receipt_batch_item' },
    { oldSchema: 'receipt', newSchema: 'billing', table: 'payment_receipt_financial_audit_log' },
    { oldSchema: 'receipt', newSchema: 'billing', table: 'payment_receipt_financial_state' },
    { oldSchema: 'receipt', newSchema: 'billing', table: 'receipt_flow_types' },
    { oldSchema: 'receipt', newSchema: 'billing', table: 'refund_credit_applications' },
    { oldSchema: 'receipt', newSchema: 'billing', table: 'refund_credit_notes' },
    // wallet -> finance
    { oldSchema: 'wallet', newSchema: 'finance', table: 'wallet_transactions' },
    { oldSchema: 'wallet', newSchema: 'finance', table: 'wallets' }
  ];

  await knex.raw(`
    DO $$
    BEGIN
      -- Drop duplicate finance.com_profit_expenses if dashboard.com_profit_expenses exists
      IF to_regclass('dashboard.com_profit_expenses') IS NOT NULL AND to_regclass('finance.com_profit_expenses') IS NOT NULL THEN
        DROP TABLE finance.com_profit_expenses CASCADE;
      END IF;

      -- Rename the remaining com_profit_expenses to store_profit_expenses
      IF to_regclass('dashboard.com_profit_expenses') IS NOT NULL THEN
        ALTER TABLE dashboard.com_profit_expenses RENAME TO store_profit_expenses;
      ELSIF to_regclass('finance.com_profit_expenses') IS NOT NULL THEN
        ALTER TABLE finance.com_profit_expenses RENAME TO store_profit_expenses;
      END IF;
    END
    $$;
  `);

  for (const item of tablesToMove) {
    await knex.raw(`
      DO $$
      BEGIN
        IF to_regclass('${item.oldSchema}.${item.table}') IS NOT NULL THEN
          ALTER TABLE ${item.oldSchema}.${item.table} SET SCHEMA ${item.newSchema};
        END IF;
      END
      $$;
    `);
  }

  // 6. Tạo lại các trigger function và normal function dưới các schema mới
  await knex.raw(`
    -- 6.1 fn_order_list_refund_force_positive
    CREATE OR REPLACE FUNCTION business.fn_order_list_refund_force_positive()
     RETURNS trigger
     LANGUAGE plpgsql
    AS $$
    DECLARE
      v_refund numeric := 0;
    BEGIN
      IF NEW.refund IS NOT NULL THEN
        v_refund := COALESCE(
          NULLIF(regexp_replace(NEW.refund::text, '[^0-9.-]', '', 'g'), '')::numeric,
          0
        );
        NEW.refund := ABS(v_refund);
      END IF;
      RETURN NEW;
    END;
    $$;

    -- 6.2 fn_recalc_dashboard_total_import
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

    -- 6.3 fn_supplier_order_cost_log_on_success
    CREATE OR REPLACE FUNCTION business.fn_supplier_order_cost_log_on_success()
     RETURNS trigger
     LANGUAGE plpgsql
    AS $$
    DECLARE
      v_unpaid CONSTANT text := 'Chưa Thanh Toán';
      v_renewal CONSTANT text := 'Cần Gia Hạn';
      v_paid CONSTANT text := 'Đã Thanh Toán';
      v_processing CONSTANT text := 'Đang Xử Lý';
      v_pending_refund CONSTANT text := 'Chưa Hoàn';
      v_pending_refund_legacy CONSTANT text := 'Chờ Hoàn';
      v_refunded CONSTANT text := 'Đã Hoàn';
      v_canceled CONSTANT text := 'Hủy';
      v_chua_tt_ncc CONSTANT text := 'Chưa Thanh Toán';
      v_is_mavryk boolean := false;
      v_is_mavn boolean := false;
      v_is_gift boolean := false;
      v_days_total numeric := 0;
      v_days_remaining numeric := 0;
      v_refund_for_log numeric := 0;
      v_cost numeric := 0;
      v_refund numeric := 0;
      v_latest_id bigint;
      v_app_managed boolean := false;
    BEGIN
      IF NEW.supply_id IS NULL THEN
        RETURN NEW;
      END IF;

      v_app_managed := COALESCE(NULLIF(current_setting('app.supplier_change_managed', true), ''), 'off') = 'on';

      v_cost := COALESCE(NULLIF(regexp_replace(NEW.cost::text, '[^0-9.-]', '', 'g'), '')::numeric, 0);
      v_refund := COALESCE(NULLIF(regexp_replace(NEW.refund::text, '[^0-9.-]', '', 'g'), '')::numeric, 0);
      v_days_total := GREATEST(
        COALESCE(NULLIF(regexp_replace(NEW.days::text, '[^0-9.-]', '', 'g'), '')::numeric, 0),
        0
      );

      v_is_mavn := UPPER(TRIM(COALESCE(NEW.id_order::text, ''))) LIKE 'MAVN%';
      v_is_gift := UPPER(TRIM(COALESCE(NEW.id_order::text, ''))) LIKE 'MAVT%';

      SELECT EXISTS (
        SELECT 1
        FROM business.supplier s
        WHERE s.id = NEW.supply_id
          AND LOWER(TRIM(COALESCE(s.supplier_name, ''))) = 'mavryk'
      )
      INTO v_is_mavryk;

      IF v_app_managed THEN
        RETURN NEW;
      END IF;

      IF v_is_mavryk THEN
        DELETE FROM business.supplier_order_cost_log WHERE order_list_id = NEW.id;
        RETURN NEW;
      END IF;

      IF TG_OP = 'INSERT' THEN
        IF NEW.status IS NOT DISTINCT FROM v_paid
           AND (v_is_mavn OR v_is_gift)
        THEN
          INSERT INTO business.supplier_order_cost_log (
            order_list_id,
            supply_id,
            id_order,
            import_cost,
            refund_amount,
            ncc_payment_status
          )
          VALUES (
            NEW.id,
            NEW.supply_id,
            COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
            v_cost,
            v_refund,
            v_chua_tt_ncc
          );
        END IF;
        RETURN NEW;
      END IF;

      IF TG_OP = 'UPDATE' THEN
        SELECT MAX(id) INTO v_latest_id
        FROM business.supplier_order_cost_log
        WHERE order_list_id = NEW.id;

        IF (
          (COALESCE(OLD.status, '') = v_unpaid AND NEW.status IS NOT DISTINCT FROM v_paid)
          OR (COALESCE(OLD.status, '') = v_renewal AND NEW.status IS NOT DISTINCT FROM v_paid)
          OR (COALESCE(OLD.status, '') = v_processing AND NEW.status IS NOT DISTINCT FROM v_paid AND v_latest_id IS NULL)
        ) THEN
          INSERT INTO business.supplier_order_cost_log (
            order_list_id,
            supply_id,
            id_order,
            import_cost,
            refund_amount,
            ncc_payment_status
          )
          VALUES (
            NEW.id,
            NEW.supply_id,
            COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
            v_cost,
            v_refund,
            v_chua_tt_ncc
          );
          RETURN NEW;
        END IF;

        IF OLD.status IS NOT DISTINCT FROM v_paid
           AND (
            NEW.status IS NOT DISTINCT FROM v_pending_refund
            OR NEW.status IS NOT DISTINCT FROM v_pending_refund_legacy
            OR NEW.status IS NOT DISTINCT FROM v_refunded
            OR NEW.status IS NOT DISTINCT FROM v_canceled
          )
        THEN
          v_days_remaining := GREATEST(
            0,
            (COALESCE(NEW.expired_at::date, CURRENT_DATE) - COALESCE(NEW.canceled_at::date, (NEW.canceled_at::timestamptz AT TIME ZONE 'UTC')::date))
          );

          IF v_cost > 0 AND v_days_total > 0 THEN
            v_refund_for_log := ROUND((v_cost * v_days_remaining) / v_days_total);
          ELSIF v_cost > 0 THEN
            v_refund_for_log := ROUND(v_cost);
          ELSE
            v_refund_for_log := 0;
          END IF;

          INSERT INTO business.supplier_order_cost_log (
            order_list_id,
            supply_id,
            id_order,
            import_cost,
            refund_amount,
            ncc_payment_status
          )
          VALUES (
            NEW.id,
            NEW.supply_id,
            COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
            v_cost,
            v_refund_for_log,
            v_chua_tt_ncc
          );
          RETURN NEW;
        END IF;

        IF (NEW.status IS NOT DISTINCT FROM v_processing OR NEW.status IS NOT DISTINCT FROM v_paid)
           AND v_latest_id IS NOT NULL
           AND OLD.status IS NOT DISTINCT FROM NEW.status
           AND (
            NEW.cost IS DISTINCT FROM OLD.cost
            OR NEW.supply_id IS DISTINCT FROM OLD.supply_id
            OR NEW.refund IS DISTINCT FROM OLD.refund
            OR NEW.id_order IS DISTINCT FROM OLD.id_order
          )
        THEN
          UPDATE business.supplier_order_cost_log l
          SET
            supply_id = NEW.supply_id,
            id_order = COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
            import_cost = v_cost,
            refund_amount = v_refund,
            logged_at = CASE WHEN v_is_mavn THEN l.logged_at ELSE NOW() END
          WHERE l.id = v_latest_id;
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$;

    -- 6.4 fn_supplier_order_cost_log_refund_note_only
    CREATE OR REPLACE FUNCTION business.fn_supplier_order_cost_log_refund_note_only()
     RETURNS trigger
     LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.refund_amount := ABS(COALESCE(NEW.refund_amount, 0));
      IF COALESCE(NEW.refund_amount, 0) > 0 THEN
        NEW.import_cost := 0;
      END IF;
      RETURN NEW;
    END;
    $$;

    -- 6.5 refresh_product_sold_30d
    CREATE OR REPLACE FUNCTION business.refresh_product_sold_30d()
     RETURNS void
     LANGUAGE plpgsql
    AS $$
        BEGIN
          REFRESH MATERIALIZED VIEW CONCURRENTLY business.product_sold_30d;
        END;
        $$;

    -- 6.6 refresh_sales_summary
    CREATE OR REPLACE FUNCTION business.refresh_sales_summary(days_back integer DEFAULT 30)
     RETURNS TABLE(summary_date date, total_orders bigint, total_revenue numeric, message text)
     LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        CURRENT_DATE as summary_date,
        0::BIGINT as total_orders,
        0::NUMERIC as total_revenue,
        'Sales summary refresh function - to be implemented' as message;
    END;
    $$;

    -- 6.7 refresh_variant_sold_count
    CREATE OR REPLACE FUNCTION business.refresh_variant_sold_count()
     RETURNS void
     LANGUAGE plpgsql
    AS $$
        BEGIN
          REFRESH MATERIALIZED VIEW CONCURRENTLY business.variant_sold_count;
          REFRESH MATERIALIZED VIEW CONCURRENTLY business.product_sold_count;
        END;
        $$;

    -- 6.8 fn_recompute_refund_credit_note_balance
    CREATE OR REPLACE FUNCTION billing.fn_recompute_refund_credit_note_balance(p_credit_note_id bigint)
     RETURNS void
     LANGUAGE plpgsql
    AS $$
    DECLARE
      v_status TEXT;
      v_refund_amount NUMERIC(18,2) := 0;
      v_applied_amount NUMERIC(18,2) := 0;
      v_available_amount NUMERIC(18,2) := 0;
      v_new_status TEXT := 'OPEN';
    BEGIN
      SELECT UPPER(TRIM(COALESCE(status::text, '')))
      INTO v_status
      FROM billing.refund_credit_notes
      WHERE id = p_credit_note_id;

      IF v_status = 'VOID' THEN
        RETURN;
      END IF;

      SELECT COALESCE(refund_amount, 0)
      INTO v_refund_amount
      FROM billing.refund_credit_notes
      WHERE id = p_credit_note_id;

      SELECT COALESCE(SUM(applied_amount), 0)
      INTO v_applied_amount
      FROM billing.refund_credit_applications
      WHERE credit_note_id = p_credit_note_id;

      v_available_amount := GREATEST(0, v_refund_amount - v_applied_amount);

      IF v_available_amount <= 0 THEN
        v_new_status := 'FULLY_APPLIED';
      ELSIF v_applied_amount > 0 THEN
        v_new_status := 'PARTIALLY_APPLIED';
      ELSE
        v_new_status := 'OPEN';
      END IF;

      UPDATE billing.refund_credit_notes
      SET
        available_amount = v_available_amount,
        status = v_new_status,
        updated_at = NOW()
      WHERE id = p_credit_note_id
        AND UPPER(TRIM(COALESCE(status::text, ''))) <> 'VOID';
    END;
    $$;

    -- 6.9 fn_refund_credit_applications_after_change
    CREATE OR REPLACE FUNCTION billing.fn_refund_credit_applications_after_change()
     RETURNS trigger
     LANGUAGE plpgsql
    AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        PERFORM billing.fn_recompute_refund_credit_note_balance(OLD.credit_note_id);
        RETURN OLD;
      END IF;

      PERFORM billing.fn_recompute_refund_credit_note_balance(NEW.credit_note_id);

      IF TG_OP = 'UPDATE' AND OLD.credit_note_id IS DISTINCT FROM NEW.credit_note_id THEN
        PERFORM billing.fn_recompute_refund_credit_note_balance(OLD.credit_note_id);
      END IF;

      RETURN NEW;
    END;
    $$;

    -- 6.10 fn_refund_credit_notes_touch_updated_at
    CREATE OR REPLACE FUNCTION billing.fn_refund_credit_notes_touch_updated_at()
     RETURNS trigger
     LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at := NOW();
      RETURN NEW;
    END;
    $$;

    -- 6.11 fn_touch_payment_receipt_batch_updated_at
    CREATE OR REPLACE FUNCTION billing.fn_touch_payment_receipt_batch_updated_at()
     RETURNS trigger
     LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$;

    -- 6.12 order_list_keys_enforce_from_order
    CREATE OR REPLACE FUNCTION system_automation.order_list_keys_enforce_from_order()
     RETURNS trigger
     LANGUAGE plpgsql
    AS $$
    DECLARE
      v_exp DATE;
      v_code VARCHAR(50);
    BEGIN
      SELECT o.expired_at, o.id_order INTO v_exp, v_code
      FROM business.order_list o
      WHERE o.id = NEW.order_list_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'order_list_id % không tồn tại trong business.order_list', NEW.order_list_id;
      END IF;

      NEW.expires_at := v_exp;
      NEW.id_order := COALESCE(NULLIF(TRIM(v_code), ''), NULLIF(TRIM(NEW.id_order), ''));
      IF NEW.id_order IS NULL THEN
        RAISE EXCEPTION 'order_list_id %: id_order trống trên order_list', NEW.order_list_id;
      END IF;

      NEW.updated_at := NOW();
      RETURN NEW;
    END;
    $$;
  `);

  // 7. Tạo lại các trigger liên kết với các bảng
  await knex.raw(`
    -- Triggers trên business.order_list
    CREATE TRIGGER tr_order_list_refund_force_positive
      BEFORE INSERT OR UPDATE ON business.order_list
      FOR EACH ROW EXECUTE FUNCTION business.fn_order_list_refund_force_positive();

    CREATE TRIGGER tr_supplier_order_cost_log_order_success
      AFTER INSERT OR UPDATE OF status, supply_id, cost, refund, id_order
      ON business.order_list
      FOR EACH ROW EXECUTE FUNCTION business.fn_supplier_order_cost_log_on_success();

    CREATE TRIGGER tr_order_list_keys_sync_order
      AFTER UPDATE OF expired_at, id_order ON business.order_list
      FOR EACH ROW EXECUTE FUNCTION system_automation.sync_order_list_keys_after_order_update();

    -- Triggers trên business.supplier_order_cost_log
    CREATE TRIGGER tr_supplier_order_cost_log_refund_note_only
      BEFORE INSERT OR UPDATE OF refund_amount ON business.supplier_order_cost_log
      FOR EACH ROW EXECUTE FUNCTION business.fn_supplier_order_cost_log_refund_note_only();

    CREATE TRIGGER trg_supplier_order_cost_log_dashboard_import
      AFTER INSERT OR UPDATE OF import_cost, logged_at OR DELETE
      ON business.supplier_order_cost_log
      FOR EACH ROW EXECUTE FUNCTION business.fn_recalc_dashboard_total_import();

    -- Triggers trên billing.refund_credit_applications
    CREATE TRIGGER tr_refund_credit_applications_after_change
      AFTER INSERT OR UPDATE OR DELETE ON billing.refund_credit_applications
      FOR EACH ROW EXECUTE FUNCTION billing.fn_refund_credit_applications_after_change();

    -- Triggers trên billing.refund_credit_notes
    CREATE TRIGGER tr_refund_credit_notes_touch_updated_at
      BEFORE UPDATE ON billing.refund_credit_notes
      FOR EACH ROW EXECUTE FUNCTION billing.fn_refund_credit_notes_touch_updated_at();

    -- Triggers trên billing.payment_receipt_batch
    CREATE TRIGGER tr_touch_payment_receipt_batch_updated_at
      BEFORE UPDATE ON billing.payment_receipt_batch
      FOR EACH ROW EXECUTE FUNCTION billing.fn_touch_payment_receipt_batch_updated_at();

    -- Triggers trên system_automation.order_list_keys
    CREATE TRIGGER tr_order_list_keys_bi_enforce
      BEFORE INSERT OR UPDATE OF order_list_id ON system_automation.order_list_keys
      FOR EACH ROW EXECUTE FUNCTION system_automation.order_list_keys_enforce_from_order();
  `);

  // 8. Tạo lại các view và materialized view
  await knex.raw(`
    -- View business.v_payment_slot_health
    CREATE OR REPLACE VIEW business.v_payment_slot_health AS
    SELECT receiver_account,
      base_amount,
      count(*) FILTER (WHERE (status = 'pending'::text)) AS pending_count,
      array_agg(amount_suffix ORDER BY amount_suffix) FILTER (WHERE (status = 'pending'::text)) AS used_suffixes,
      (100 - count(*) FILTER (WHERE (status = 'pending'::text))) AS free_slots,
      max(created_at) FILTER (WHERE (status = 'pending'::text)) AS oldest_pending_at
     FROM business.order_payment_slots
    GROUP BY receiver_account, base_amount
   HAVING (count(*) FILTER (WHERE (status = 'pending'::text)) > 0);

    -- Materialized view business.variant_sold_count
    CREATE MATERIALIZED VIEW business.variant_sold_count AS
    SELECT TRIM(BOTH FROM (v.display_name)::text) AS variant_display_name,
      v.id AS variant_id,
      v.product_id,
      COALESCE(order_totals.sales_count, 0) AS sales_count,
      CURRENT_TIMESTAMP AS updated_at
     FROM (business.variant v
       LEFT JOIN ( SELECT ol.id_product AS variant_id,
              (count(*))::integer AS sales_count
             FROM business.order_list ol
            WHERE (ol.id_product IS NOT NULL)
            GROUP BY ol.id_product) order_totals ON ((order_totals.variant_id = v.id)));

    -- Materialized view business.product_sold_30d
    CREATE MATERIALIZED VIEW business.product_sold_30d AS
    SELECT p.id AS product_id,
      p.package_name,
      COALESCE(sold_data.sold_count_30d, 0) AS sold_count_30d,
      (COALESCE(sold_data.revenue_30d, (0)::numeric))::numeric(15,2) AS revenue_30d,
      CURRENT_TIMESTAMP AS updated_at
     FROM (business.product p
       LEFT JOIN ( SELECT v.product_id,
              (count(*))::integer AS sold_count_30d,
              (sum(COALESCE(ol.price, 0)))::numeric(15,2) AS revenue_30d
             FROM (business.order_list ol
               JOIN business.variant v ON ((ol.id_product = v.id)))
            WHERE ((ol.id_product IS NOT NULL) AND (ol.order_date >= (CURRENT_DATE - '30 days'::interval)) AND (ol.status <> ALL (ARRAY['Đã Hủy'::text, 'Chưa Hoàn'::text, 'Đã Hoàn'::text])))
            GROUP BY v.product_id) sold_data ON ((p.id = sold_data.product_id)));

    -- Materialized view business.product_sold_count
    CREATE MATERIALIZED VIEW business.product_sold_count AS
    SELECT p.id AS product_id,
      p.package_name,
      (COALESCE(sum(vsc.sales_count), (0)::bigint))::integer AS total_sales_count,
      CURRENT_TIMESTAMP AS updated_at
     FROM (business.product p
       LEFT JOIN business.variant_sold_count vsc ON ((vsc.product_id = p.id)))
    GROUP BY p.id, p.package_name;
  `);

  // 9. Tạo lại indexes cho các materialized view mới
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_variant_sold_count_display_name ON business.variant_sold_count (variant_display_name);
    CREATE INDEX IF NOT EXISTS idx_variant_sold_count_product_id ON business.variant_sold_count (product_id);
    CREATE INDEX IF NOT EXISTS idx_variant_sold_count_sales ON business.variant_sold_count (sales_count DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_variant_sold_count_variant_id ON business.variant_sold_count (variant_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_product_sold_30d_product_id ON business.product_sold_30d (product_id);
    CREATE INDEX IF NOT EXISTS idx_product_sold_30d_revenue ON business.product_sold_30d (revenue_30d DESC);
    CREATE INDEX IF NOT EXISTS idx_product_sold_30d_sold_count ON business.product_sold_30d (sold_count_30d DESC);
    CREATE INDEX IF NOT EXISTS idx_product_sold_30d_updated_at ON business.product_sold_30d (updated_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_product_sold_count_product_id ON business.product_sold_count (product_id);
    CREATE INDEX IF NOT EXISTS idx_product_sold_count_sales ON business.product_sold_count (total_sales_count DESC);
  `);
};

exports.down = async function (knex) {
  // Bản down sẽ đảo ngược tất cả bằng cách đưa các bảng về schema cũ (nếu schema cũ còn tồn tại)
  const tablesToRestore = [
    // finance -> admin
    { oldSchema: 'admin', newSchema: 'finance', table: 'ip_whitelist' },
    { oldSchema: 'admin', newSchema: 'finance', table: 'shop_bank_account_ledger' },
    { oldSchema: 'admin', newSchema: 'finance', table: 'shop_bank_accounts' },
    { oldSchema: 'admin', newSchema: 'finance', table: 'site_settings' },
    { oldSchema: 'admin', newSchema: 'finance', table: 'usdt_wallet_ledger' },
    { oldSchema: 'admin', newSchema: 'finance', table: 'usdt_wallets' },
    { oldSchema: 'admin', newSchema: 'finance', table: 'users' },
    // finance -> admin_finance
    { oldSchema: 'admin_finance', newSchema: 'finance', table: 'financial_allocation_ledger' },
    // finance -> dashboard
    { oldSchema: 'dashboard', newSchema: 'finance', table: 'daily_revenue_summary' },
    { oldSchema: 'dashboard', newSchema: 'finance', table: 'dashboard_financial_change_log' },
    { oldSchema: 'dashboard', newSchema: 'finance', table: 'dashboard_monthly_summary' },
    { oldSchema: 'dashboard', newSchema: 'finance', table: 'store_profit_expenses' },
    { oldSchema: 'dashboard', newSchema: 'finance', table: 'trans_dailybalances' },
    { oldSchema: 'dashboard', newSchema: 'finance', table: 'master_wallettypes' },
    { oldSchema: 'dashboard', newSchema: 'finance', table: 'saving_goals' },
    // business -> orders
    { oldSchema: 'orders', newSchema: 'business', table: 'order_customer' },
    { oldSchema: 'orders', newSchema: 'business', table: 'order_list' },
    { oldSchema: 'orders', newSchema: 'business', table: 'order_payment_slots' },
    // business -> partner
    { oldSchema: 'partner', newSchema: 'business', table: 'supplier' },
    { oldSchema: 'partner', newSchema: 'business', table: 'supplier_order_cost_log' },
    { oldSchema: 'partner', newSchema: 'business', table: 'supplier_payments' },
    // business -> product
    { oldSchema: 'product', newSchema: 'business', table: 'category' },
    { oldSchema: 'product', newSchema: 'business', table: 'desc_variant' },
    { oldSchema: 'product', newSchema: 'business', table: 'import_package_rules' },
    { oldSchema: 'product', newSchema: 'business', table: 'package_product' },
    { oldSchema: 'product', newSchema: 'business', table: 'pricing_tier' },
    { oldSchema: 'product', newSchema: 'business', table: 'product' },
    { oldSchema: 'product', newSchema: 'business', table: 'product_category' },
    { oldSchema: 'product', newSchema: 'business', table: 'productid_payment' },
    { oldSchema: 'product', newSchema: 'business', table: 'reviews' },
    { oldSchema: 'product', newSchema: 'business', table: 'supplier_cost' },
    { oldSchema: 'product', newSchema: 'business', table: 'variant' },
    { oldSchema: 'product', newSchema: 'business', table: 'variant_price' },
    { oldSchema: 'product', newSchema: 'business', table: 'variant_sales_summary' },
    // business -> promotion
    { oldSchema: 'promotion', newSchema: 'business', table: 'account_promotions' },
    { oldSchema: 'promotion', newSchema: 'business', table: 'promotion_codes' },
    // billing -> receipt
    { oldSchema: 'receipt', newSchema: 'billing', table: 'payment_receipt' },
    { oldSchema: 'receipt', newSchema: 'billing', table: 'payment_receipt_batch' },
    { oldSchema: 'receipt', newSchema: 'billing', table: 'payment_receipt_batch_item' },
    { oldSchema: 'receipt', newSchema: 'billing', table: 'payment_receipt_financial_audit_log' },
    { oldSchema: 'receipt', newSchema: 'billing', table: 'payment_receipt_financial_state' },
    { oldSchema: 'receipt', newSchema: 'billing', table: 'receipt_flow_types' },
    { oldSchema: 'receipt', newSchema: 'billing', table: 'refund_credit_applications' },
    { oldSchema: 'receipt', newSchema: 'billing', table: 'refund_credit_notes' },
    // finance -> wallet
    { oldSchema: 'wallet', newSchema: 'finance', table: 'wallet_transactions' },
    { oldSchema: 'wallet', newSchema: 'finance', table: 'wallets' }
  ];

  // Xóa các trigger & function mới
  await knex.raw(`
    DROP VIEW IF EXISTS business.v_payment_slot_health CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS business.variant_sold_count CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS business.product_sold_30d CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS business.product_sold_count CASCADE;
    
    DROP TRIGGER IF EXISTS tr_order_list_refund_force_positive ON business.order_list;
    DROP TRIGGER IF EXISTS tr_supplier_order_cost_log_order_success ON business.order_list;
    DROP TRIGGER IF EXISTS tr_order_list_keys_sync_order ON business.order_list;
    DROP TRIGGER IF EXISTS tr_supplier_order_cost_log_refund_note_only ON business.supplier_order_cost_log;
    DROP TRIGGER IF EXISTS trg_supplier_order_cost_log_dashboard_import ON business.supplier_order_cost_log;
    DROP TRIGGER IF EXISTS tr_refund_credit_applications_after_change ON billing.refund_credit_applications;
    DROP TRIGGER IF EXISTS tr_refund_credit_notes_touch_updated_at ON billing.refund_credit_notes;
    DROP TRIGGER IF EXISTS tr_touch_payment_receipt_batch_updated_at ON billing.payment_receipt_batch;
    DROP TRIGGER IF EXISTS tr_order_list_keys_bi_enforce ON system_automation.order_list_keys;

    DROP FUNCTION IF EXISTS business.fn_order_list_refund_force_positive();
    DROP FUNCTION IF EXISTS business.fn_recalc_dashboard_total_import();
    DROP FUNCTION IF EXISTS business.fn_supplier_order_cost_log_on_success();
    DROP FUNCTION IF EXISTS business.fn_supplier_order_cost_log_refund_note_only();
    DROP FUNCTION IF EXISTS business.refresh_product_sold_30d();
    DROP FUNCTION IF EXISTS business.refresh_sales_summary(integer);
    DROP FUNCTION IF EXISTS business.refresh_variant_sold_count();
    DROP FUNCTION IF EXISTS billing.fn_recompute_refund_credit_note_balance(bigint);
    DROP FUNCTION IF EXISTS billing.fn_refund_credit_applications_after_change();
    DROP FUNCTION IF EXISTS billing.fn_refund_credit_notes_touch_updated_at();
    DROP FUNCTION IF EXISTS billing.fn_touch_payment_receipt_batch_updated_at();
  `);

  // Di chuyển ngược lại
  for (const item of tablesToRestore) {
    await knex.raw(`
      DO $$
      BEGIN
        IF to_regclass('${item.newSchema}.${item.table}') IS NOT NULL THEN
          ALTER TABLE ${item.newSchema}.${item.table} SET SCHEMA ${item.oldSchema};
        END IF;
      END
      $$;
    `);
  }

  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('dashboard.store_profit_expenses') IS NOT NULL THEN
        ALTER TABLE dashboard.store_profit_expenses RENAME TO com_profit_expenses;
      ELSIF to_regclass('finance.store_profit_expenses') IS NOT NULL THEN
        ALTER TABLE finance.store_profit_expenses RENAME TO com_profit_expenses;
      END IF;
    END
    $$;
  `);
};
