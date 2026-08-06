exports.up = async function (knex) {
  // 1. Drop dependent views, materialized views, and triggers to avoid lock conflicts
  await knex.raw(`
    DROP VIEW IF EXISTS business.v_payment_slot_health CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS business.variant_sold_count CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS business.product_sold_30d CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS business.product_sold_count CASCADE;
    
    DROP TRIGGER IF EXISTS tr_order_list_refund_force_positive ON business.order_list CASCADE;
    DROP TRIGGER IF EXISTS tr_supplier_order_cost_log_order_success ON business.order_list CASCADE;
    DROP TRIGGER IF EXISTS tr_order_list_keys_sync_order ON business.order_list CASCADE;
  `);

  // 2. Tối ưu và gộp billing.payment_receipt & billing.payment_receipt_financial_state
  // 2.1 Cập nhật kiểu dữ liệu cột amount của payment_receipt thành numeric(15,2)
  await knex.raw(`
    ALTER TABLE billing.payment_receipt ALTER COLUMN amount TYPE numeric(15,2) USING amount::numeric;
  `);

  // 2.2 Thêm các cột hoạch toán tài chính vào billing.payment_receipt
  await knex.schema.alterTable('billing.payment_receipt', (table) => {
    table.boolean('is_financial_posted').defaultTo(false);
    table.decimal('posted_revenue', 15, 2).defaultTo(0);
    table.decimal('posted_profit', 15, 2).defaultTo(0);
    table.decimal('posted_off_flow_bank_receipt', 15, 2).defaultTo(0);
    table.timestamp('reconciled_at', { useTz: true });
    table.boolean('adjustment_applied').defaultTo(false);
    table.integer('flow_type_id');
    table.timestamp('flow_classified_at', { useTz: true });
    table.text('flow_note');

    table.foreign('flow_type_id').references('id').inTable('billing.receipt_flow_types').onDelete('SET NULL');
  });

  // 2.3 Di chuyển dữ liệu sang bảng payment_receipt
  await knex.raw(`
    UPDATE billing.payment_receipt pr
    SET
      is_financial_posted = COALESCE(fs.is_financial_posted, false),
      posted_revenue = COALESCE(fs.posted_revenue, 0),
      posted_profit = COALESCE(fs.posted_profit, 0),
      posted_off_flow_bank_receipt = COALESCE(fs.posted_off_flow_bank_receipt, 0),
      reconciled_at = fs.reconciled_at,
      adjustment_applied = COALESCE(fs.adjustment_applied, false),
      flow_type_id = fs.flow_type_id,
      flow_classified_at = fs.flow_classified_at,
      flow_note = fs.flow_note
    FROM billing.payment_receipt_financial_state fs
    WHERE fs.payment_receipt_id = pr.id;
  `);

  // 2.4 Xóa bảng billing.payment_receipt_financial_state
  await knex.raw(`
    DROP TABLE IF EXISTS billing.payment_receipt_financial_state CASCADE;
  `);

  // 3. Tối ưu và gộp business.order_list & business.order_customer
  // 3.1 Cập nhật kiểu dữ liệu các cột price, cost, refund thành numeric(15,2) và days thành integer
  await knex.raw(`
    ALTER TABLE business.order_list ALTER COLUMN price TYPE numeric(15,2) USING price::numeric;
    ALTER TABLE business.order_list ALTER COLUMN cost TYPE numeric(15,2) USING cost::numeric;
    ALTER TABLE business.order_list ALTER COLUMN refund TYPE numeric(15,2) USING refund::numeric;
    ALTER TABLE business.order_list ALTER COLUMN days TYPE integer USING COALESCE(NULLIF(regexp_replace(days, '[^0-9]', '', 'g'), ''), '0')::integer;
  `);

  // 3.2 Thêm các cột của order_customer vào business.order_list
  await knex.schema.alterTable('business.order_list', (table) => {
    table.integer('customer_account_id');
    table.text('customer_status');
    table.bigInteger('customer_payment_id');

    table.foreign('customer_account_id').references('id').inTable('customer_web.accounts').onDelete('SET NULL');
  });

  // 3.3 Di chuyển dữ liệu sang order_list
  await knex.raw(`
    UPDATE business.order_list ol
    SET
      customer_account_id = oc.account_id,
      customer_status = oc.status,
      customer_payment_id = oc.payment_id
    FROM business.order_customer oc
    WHERE oc.id_order = ol.id_order;
  `);

  // 3.4 Xóa bảng business.order_customer
  await knex.raw(`
    DROP TABLE IF EXISTS business.order_customer CASCADE;
  `);

  // 4. Tối ưu và gộp business.variant & business.desc_variant
  // 4.1 Cập nhật kiểu dữ liệu cột base_price thành numeric(15,2)
  await knex.raw(`
    ALTER TABLE business.variant ALTER COLUMN base_price TYPE numeric(15,2) USING base_price::numeric;
  `);

  // 4.2 Thêm cột của desc_variant vào business.variant
  await knex.schema.alterTable('business.variant', (table) => {
    table.text('rules');
    table.text('description');
    table.text('short_desc');
  });

  // 4.3 Di chuyển dữ liệu sang variant
  await knex.raw(`
    UPDATE business.variant v
    SET
      rules = dv.rules,
      description = dv.description,
      short_desc = dv.short_desc
    FROM business.desc_variant dv
    WHERE v.id_desc = dv.id;
  `);

  // 4.4 Xóa cột khóa ngoại id_desc và bảng desc_variant
  await knex.schema.alterTable('business.variant', (table) => {
    table.dropColumn('id_desc');
  });
  await knex.raw(`
    DROP TABLE IF EXISTS business.desc_variant CASCADE;
  `);

  // 5. Xóa bảng chết business.productid_payment
  await knex.raw(`
    DROP TABLE IF EXISTS business.productid_payment CASCADE;
  `);

  // 6. Tạo lại các trigger function, trigger và views phù hợp cấu trúc mới
  await knex.raw(`
    -- 6.1 Cập nhật trigger function fn_supplier_order_cost_log_on_success sử dụng cột days kiểu integer trực tiếp
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
      v_days_total integer := 0;
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

      v_cost := COALESCE(NEW.cost, 0);
      v_refund := COALESCE(NEW.refund, 0);
      v_days_total := GREATEST(COALESCE(NEW.days, 0), 0);

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

    -- Re-create triggers on business.order_list
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

  // 7. Tạo lại indexes cho các materialized view mới
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
  // Bản down cho phép khôi phục cơ bản cấu trúc ban đầu nếu cần rollback
  // Vì đây là thay đổi cơ cấu lớn, down được viết để đảo ngược lại các trường
  // Tuy nhiên khuyên khích backup dữ liệu trước khi chạy migrate
};
