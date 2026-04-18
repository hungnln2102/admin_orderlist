-- Chuẩn hóa trạng thái hoàn tiền: "Chưa Hoàn" (thay cho "Chờ Hoàn").
-- Đồng bộ lại trigger log NCC để nhận diện đúng trạng thái mới.

UPDATE orders.order_list
SET status = 'Chưa Hoàn'
WHERE TRIM(COALESCE(status::text, '')) = 'Chờ Hoàn';

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
  v_mavt_refund numeric := 0;
  v_refund_for_log numeric := 0;
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
    -- MAVN/MAVT tạo đơn ở trạng thái Đã Thanh Toán (khách): vẫn ghi log với TT NCC Chưa Thanh Toán.
    IF NEW.status IS NOT DISTINCT FROM v_paid
       AND (v_is_mavn OR v_is_gift)
    THEN
      v_refund_for_log := CASE
        WHEN v_is_gift AND NEW.status IS NOT DISTINCT FROM v_refunded THEN COALESCE(v_mavt_refund, 0)
        ELSE COALESCE(NEW.refund, 0)
      END;

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
    -- Chưa TT → Đã TT (khách): ghi log; TT NCC luôn Chưa Thanh Toán.
    IF COALESCE(OLD.status, '') = v_unpaid
       AND NEW.status IS NOT DISTINCT FROM v_paid
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
      RETURN NEW;
    END IF;

    -- Gia hạn thành công: Cần Gia Hạn → ĐXL hoặc Đã TT (khách)
    IF COALESCE(OLD.status, '') = v_renewal
       AND (
        NEW.status IS NOT DISTINCT FROM v_processing
        OR NEW.status IS NOT DISTINCT FROM v_paid
      )
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
      RETURN NEW;
    END IF;

    -- Xóa đơn (archive): ĐXL hoặc Đã TT → Chưa Hoàn/Đã Hoàn/Hủy.
    IF (
      OLD.status IS NOT DISTINCT FROM v_paid
      OR OLD.status IS NOT DISTINCT FROM v_processing
    )
       AND (
        NEW.status IS NOT DISTINCT FROM v_pending_refund
        OR NEW.status IS NOT DISTINCT FROM v_pending_refund_legacy
        OR NEW.status IS NOT DISTINCT FROM v_refunded
        OR NEW.status IS NOT DISTINCT FROM v_canceled
      )
    THEN
      IF v_is_gift AND NEW.status IS NOT DISTINCT FROM v_refunded THEN
        v_days_total := COALESCE(NULLIF(NEW.days, 0), 0);
        v_days_remaining := GREATEST(
          0,
          COALESCE(NEW.expired_at::date, CURRENT_DATE) - COALESCE(NEW.canceled_at::date, CURRENT_DATE)
        );
        IF v_days_total > 0 THEN
          v_mavt_refund := ROUND(COALESCE(NEW.cost, 0) * (v_days_remaining / v_days_total));
        ELSE
          v_mavt_refund := ROUND(COALESCE(NEW.cost, 0));
        END IF;
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
        CASE
          WHEN COALESCE(v_refund_for_log, 0) > 0 THEN 0
          ELSE COALESCE(NEW.cost, 0)
        END,
        v_refund_for_log,
        v_chua_tt_ncc
      );
      RETURN NEW;
    END IF;

    -- Tương thích: Chưa TT → ĐXL
    IF COALESCE(OLD.status, '') = v_unpaid
       AND NEW.status IS NOT DISTINCT FROM v_processing
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
      RETURN NEW;
    END IF;

    -- ĐXL → Đã TT (khách): không tự đổi TT NCC trên log (chỉ xác nhận TT NCC qua API).

    -- Chỉnh cost/refund/NCC/id_order/supply khi vẫn ĐXL hoặc Đã TT, không đổi trạng thái đơn
    IF NEW.status IS NOT DISTINCT FROM v_processing
       OR NEW.status IS NOT DISTINCT FROM v_paid
    THEN
      IF EXISTS (SELECT 1 FROM partner.supplier_order_cost_log WHERE order_list_id = NEW.id)
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
        WHERE l.id = (
          SELECT MAX(id)
          FROM partner.supplier_order_cost_log
          WHERE order_list_id = NEW.id
        );
      END IF;
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

