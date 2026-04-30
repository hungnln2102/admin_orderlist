-- Chuyển log từ orders.supplier_order_cost_log (bản cũ) sang partner; trigger chỉ ghi khi Đang Xử Lý.
-- An toàn khi chạy lại: DB mới chỉ có partner; DB cũ có bảng trong orders thì copy rồi xóa.

DROP TRIGGER IF EXISTS tr_supplier_order_cost_log_order_success ON orders.order_list;
DROP FUNCTION IF EXISTS orders.fn_supplier_order_cost_log_on_success();

CREATE TABLE IF NOT EXISTS partner.supplier_order_cost_log (
  id BIGSERIAL PRIMARY KEY,
  order_list_id INTEGER NOT NULL,
  supply_id INTEGER NOT NULL,
  id_order VARCHAR(100) NOT NULL,
  import_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT supplier_order_cost_log_order_list_fk
    FOREIGN KEY (order_list_id) REFERENCES orders.order_list (id) ON DELETE CASCADE,
  CONSTRAINT supplier_order_cost_log_order_list_id_key UNIQUE (order_list_id)
);

DO $$
BEGIN
  IF to_regclass('orders.supplier_order_cost_log') IS NOT NULL THEN
    INSERT INTO partner.supplier_order_cost_log (
      order_list_id,
      supply_id,
      id_order,
      import_cost,
      refund_amount,
      logged_at
    )
    SELECT
      order_list_id,
      supply_id,
      id_order,
      import_cost,
      refund_amount,
      logged_at
    FROM orders.supplier_order_cost_log
    ON CONFLICT (order_list_id) DO NOTHING;

    DROP TABLE orders.supplier_order_cost_log;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_supplier_order_cost_log_supply_id
  ON partner.supplier_order_cost_log (supply_id);

CREATE INDEX IF NOT EXISTS idx_supplier_order_cost_log_logged_at
  ON partner.supplier_order_cost_log (logged_at DESC);

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

CREATE TRIGGER tr_supplier_order_cost_log_order_success
  AFTER INSERT OR UPDATE OF status, supply_id, cost, refund, id_order
  ON orders.order_list
  FOR EACH ROW
  EXECUTE PROCEDURE partner.fn_supplier_order_cost_log_on_success();
