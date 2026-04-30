-- New finance rule:
-- - Manual payment action moves UNPAID/RENEWAL to PROCESSING only.
-- - PROCESSING does not post revenue and does not create supplier cost log.
-- - Webhook moves PROCESSING/UNPAID/RENEWAL to PAID and creates the financial/import records.
-- - Drop the receipt insert trigger so revenue is posted only by webhook application logic.

DROP TRIGGER IF EXISTS tr_payment_receipt_dashboard_revenue ON receipt.payment_receipt;
DROP FUNCTION IF EXISTS receipt.fn_bump_dashboard_monthly_revenue();

DROP TRIGGER IF EXISTS tr_supplier_order_cost_log_order_success ON orders.order_list;

CREATE OR REPLACE FUNCTION partner.fn_supplier_order_cost_log_on_success()
RETURNS TRIGGER
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
  v_latest_id bigint;
BEGIN
  IF NEW.supply_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_mavn := UPPER(TRIM(COALESCE(NEW.id_order::text, ''))) LIKE 'MAVN%';
  v_is_gift := UPPER(TRIM(COALESCE(NEW.id_order::text, ''))) LIKE 'MAVT%';

  SELECT EXISTS (
    SELECT 1
    FROM partner.supplier s
    WHERE s.id = NEW.supply_id
      AND LOWER(TRIM(COALESCE(s.supplier_name, ''))) = 'mavryk'
  )
  INTO v_is_mavryk;

  IF v_is_mavryk THEN
    DELETE FROM partner.supplier_order_cost_log WHERE order_list_id = NEW.id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NOT DISTINCT FROM v_paid
       AND (v_is_mavn OR v_is_gift)
    THEN
      INSERT INTO partner.supplier_order_cost_log (
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
        COALESCE(NEW.cost, 0),
        COALESCE(NEW.refund, 0),
        v_chua_tt_ncc
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT MAX(id) INTO v_latest_id
    FROM partner.supplier_order_cost_log
    WHERE order_list_id = NEW.id;

    IF (
      (COALESCE(OLD.status, '') = v_unpaid AND NEW.status IS NOT DISTINCT FROM v_paid)
      OR (COALESCE(OLD.status, '') = v_renewal AND NEW.status IS NOT DISTINCT FROM v_paid)
      OR (COALESCE(OLD.status, '') = v_processing AND NEW.status IS NOT DISTINCT FROM v_paid AND v_latest_id IS NULL)
    ) THEN
      INSERT INTO partner.supplier_order_cost_log (
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
        COALESCE(NEW.cost, 0),
        COALESCE(NEW.refund, 0),
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
      v_cost := COALESCE(NEW.cost, 0);
      v_days_total := GREATEST(COALESCE(NEW.days, 0), 0);
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

      INSERT INTO partner.supplier_order_cost_log (
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
        COALESCE(NEW.cost, 0),
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
      UPDATE partner.supplier_order_cost_log l
      SET
        supply_id = NEW.supply_id,
        id_order = COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
        import_cost = COALESCE(NEW.cost, 0),
        refund_amount = COALESCE(NEW.refund, 0),
        logged_at = NOW()
      WHERE l.id = v_latest_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_supplier_order_cost_log_order_success
  AFTER INSERT OR UPDATE OF status, supply_id, cost, refund, id_order
  ON orders.order_list
  FOR EACH ROW
  EXECUTE PROCEDURE partner.fn_supplier_order_cost_log_on_success();
