-- Nhiều dòng log / đơn (bỏ UNIQUE order_list_id).
-- Cập nhật đồng bộ cost / TT NCC chỉ trên dòng mới nhất (MAX(id)).
-- INSERT khi: Chưa TT hoặc Cần Gia Hạn → ĐXL; MAVN tạo đã ĐXL; đổi NCC chỉ sửa dòng mới nhất.
-- Khi rời ĐXL (Chờ Hoàn / Hủy…): không map order.refund (khách) vào refund_amount trên log.

ALTER TABLE partner.supplier_order_cost_log
  DROP CONSTRAINT IF EXISTS supplier_order_cost_log_order_list_id_key;

CREATE INDEX IF NOT EXISTS idx_supplier_order_cost_log_order_list_id_desc
  ON partner.supplier_order_cost_log (order_list_id, id DESC);

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
  v_chua_tt_ncc CONSTANT text := 'Chưa Thanh Toán';
  v_da_tt_ncc CONSTANT text := 'Đã Thanh Toán';
  v_old_processing boolean;
  v_new_processing boolean;
  v_latest_id bigint;
BEGIN
  IF NEW.supply_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- MAVN: đơn tạo xong đã «Đang Xử Lý» → một dòng log
  IF TG_OP = 'INSERT'
     AND NEW.status = v_processing
     AND UPPER(TRIM(COALESCE(NEW.id_order::text, ''))) LIKE 'MAVN%'
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

  IF TG_OP = 'UPDATE' THEN
    SELECT MAX(id) INTO v_latest_id
    FROM partner.supplier_order_cost_log
    WHERE order_list_id = NEW.id;

    IF v_latest_id IS NOT NULL THEN
      UPDATE partner.supplier_order_cost_log
      SET ncc_payment_status = CASE
        WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc
        ELSE v_chua_tt_ncc
      END
      WHERE id = v_latest_id;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS NOT DISTINCT FROM v_paid
       AND COALESCE(OLD.status, '') = v_renewal
    THEN
      RETURN NEW;
    END IF;

    IF NEW.status IS NOT DISTINCT FROM v_paid
       AND COALESCE(OLD.status, '') = v_unpaid
       AND EXISTS (
         SELECT 1
         FROM partner.supplier s
         WHERE s.id = NEW.supply_id
           AND LOWER(TRIM(COALESCE(s.supplier_name, ''))) IN ('mavryk', 'shop')
       )
    THEN
      RETURN NEW;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT MAX(id) INTO v_latest_id
    FROM partner.supplier_order_cost_log
    WHERE order_list_id = NEW.id;

    IF v_latest_id IS NOT NULL
       AND (
         NEW.refund IS DISTINCT FROM OLD.refund
         OR NEW.cost IS DISTINCT FROM OLD.cost
         OR NEW.supply_id IS DISTINCT FROM OLD.supply_id
         OR NEW.id_order IS DISTINCT FROM OLD.id_order
       )
       AND NEW.status IS DISTINCT FROM v_processing
    THEN
      UPDATE partner.supplier_order_cost_log
      SET
        supply_id = NEW.supply_id,
        id_order = COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
        import_cost = COALESCE(NEW.cost, 0),
        ncc_payment_status = CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END,
        logged_at = NOW()
      WHERE id = v_latest_id;
      RETURN NEW;
    END IF;
  END IF;

  v_new_processing := (NEW.status = v_processing);
  IF NOT v_new_processing THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old_processing := (OLD.status = v_processing);

    IF NOT v_old_processing
       AND (OLD.status IS NOT DISTINCT FROM v_unpaid OR OLD.status IS NOT DISTINCT FROM v_renewal)
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

    IF OLD.supply_id IS DISTINCT FROM NEW.supply_id THEN
      SELECT MAX(id) INTO v_latest_id
      FROM partner.supplier_order_cost_log
      WHERE order_list_id = NEW.id;

      IF v_latest_id IS NOT NULL THEN
        UPDATE partner.supplier_order_cost_log
        SET
          supply_id = NEW.supply_id,
          id_order = COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
          import_cost = COALESCE(NEW.cost, 0),
          refund_amount = COALESCE(NEW.refund, 0),
          ncc_payment_status = CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END,
          logged_at = NOW()
        WHERE id = v_latest_id;
      ELSE
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

    SELECT MAX(id) INTO v_latest_id
    FROM partner.supplier_order_cost_log
    WHERE order_list_id = NEW.id;

    IF v_latest_id IS NOT NULL THEN
      UPDATE partner.supplier_order_cost_log
      SET
        supply_id = NEW.supply_id,
        id_order = COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
        import_cost = COALESCE(NEW.cost, 0),
        refund_amount = COALESCE(NEW.refund, 0),
        ncc_payment_status = CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END,
        logged_at = NOW()
      WHERE id = v_latest_id;
    ELSE
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

  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_supplier_order_cost_log_order_success
  AFTER INSERT OR UPDATE OF status, supply_id, cost, refund, id_order
  ON orders.order_list
  FOR EACH ROW
  EXECUTE PROCEDURE partner.fn_supplier_order_cost_log_on_success();
