-- Bỏ supplier_name và order_status_at_log; tên NCC lấy qua JOIN supply_id (API / báo cáo).

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
  v_old_ok boolean;
  v_new_ok boolean;
BEGIN
  IF NEW.supply_id IS NULL THEN
    RETURN NEW;
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

  v_new_ok := NEW.status = v_processing;
  IF NOT v_new_ok THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO partner.supplier_order_cost_log (
      order_list_id,
      supply_id,
      id_order,
      import_cost,
      refund_amount
    )
    VALUES (
      NEW.id,
      NEW.supply_id,
      COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
      COALESCE(NEW.cost, 0),
      COALESCE(NEW.refund, 0)
    )
    ON CONFLICT (order_list_id) DO NOTHING;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old_ok := OLD.status = v_processing;
    IF v_old_ok THEN
      RETURN NEW;
    END IF;

    INSERT INTO partner.supplier_order_cost_log (
      order_list_id,
      supply_id,
      id_order,
      import_cost,
      refund_amount
    )
    VALUES (
      NEW.id,
      NEW.supply_id,
      COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
      COALESCE(NEW.cost, 0),
      COALESCE(NEW.refund, 0)
    )
    ON CONFLICT (order_list_id) DO NOTHING;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE partner.supplier_order_cost_log
  DROP COLUMN IF EXISTS supplier_name;

ALTER TABLE partner.supplier_order_cost_log
  DROP COLUMN IF EXISTS order_status_at_log;

CREATE TRIGGER tr_supplier_order_cost_log_order_success
  AFTER INSERT OR UPDATE OF status, supply_id, cost, refund, id_order
  ON orders.order_list
  FOR EACH ROW
  EXECUTE PROCEDURE partner.fn_supplier_order_cost_log_on_success();
