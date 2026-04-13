-- Gộp: supplier_order_cost_log + trigger (039→054) + supplier_payments/ledger (045–048).
-- Chạy một lần trên DB mới hoặc sau khi dọn knex_migrations các bản cũ cùng chuỗi.

-- ========== 039_supplier_order_cost_log.sql ==========

-- partner.supplier_order_cost_log — chi phí NCC theo đơn (trigger trên orders.order_list).
--
-- ncc_payment_status: Chưa Thanh Toán / Đã Thanh Toán — đồng bộ khi orders.order_list.status đổi.
-- Quy tắc khác: chỉ tạo dòng khi vào Đang Xử Lý; Mavryk/Shop nhảy TT; Gia hạn → TT.

CREATE TABLE IF NOT EXISTS partner.supplier_order_cost_log (
  id BIGSERIAL PRIMARY KEY,
  order_list_id INTEGER NOT NULL,
  supply_id INTEGER NOT NULL,
  id_order VARCHAR(100) NOT NULL,
  import_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  ncc_payment_status VARCHAR(40) NOT NULL DEFAULT 'Chưa Thanh Toán',
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT supplier_order_cost_log_order_list_fk
    FOREIGN KEY (order_list_id) REFERENCES orders.order_list (id) ON DELETE CASCADE,
  CONSTRAINT supplier_order_cost_log_order_list_id_key UNIQUE (order_list_id)
);

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
  v_chua_tt_ncc CONSTANT text := 'Chưa Thanh Toán';
  v_da_tt_ncc CONSTANT text := 'Đã Thanh Toán';
  v_old_ok boolean;
  v_new_ok boolean;
BEGIN
  IF NEW.supply_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    UPDATE partner.supplier_order_cost_log
    SET ncc_payment_status = CASE
      WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc
      ELSE v_chua_tt_ncc
    END
    WHERE order_list_id = NEW.id;
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
    )
    ON CONFLICT (order_list_id) DO NOTHING;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_supplier_order_cost_log_order_success ON orders.order_list;
CREATE TRIGGER tr_supplier_order_cost_log_order_success
  AFTER INSERT OR UPDATE OF status, supply_id, cost, refund, id_order
  ON orders.order_list
  FOR EACH ROW
  EXECUTE PROCEDURE partner.fn_supplier_order_cost_log_on_success();


-- ========== 040_supplier_order_cost_log_move_to_partner.sql ==========

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


-- ========== 041_supplier_order_cost_log_processing_only.sql ==========

-- (Lịch sử) Chỉ ghi khi Đang Xử Lý — logic đầy đủ xem 039 / 043.

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


-- ========== 042_supplier_order_cost_log_business_rules.sql ==========

-- Quy tắc Mavryk/Shop + Gia hạn — đồng bộ với 039 / 043.

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


-- ========== 043_supplier_order_cost_log_drop_name_status.sql ==========

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


-- ========== 044_supplier_order_cost_log_ncc_payment_status.sql ==========

-- Trạng thái thanh toán NCC theo dòng log: Chưa Thanh Toán / Đã Thanh Toán (theo orders.order_list.status).

ALTER TABLE partner.supplier_order_cost_log
  ADD COLUMN IF NOT EXISTS ncc_payment_status VARCHAR(40) NOT NULL DEFAULT 'Chưa Thanh Toán';

UPDATE partner.supplier_order_cost_log l
SET ncc_payment_status = CASE
  WHEN TRIM(COALESCE(o.status::text, '')) = 'Đã Thanh Toán' THEN 'Đã Thanh Toán'
  ELSE 'Chưa Thanh Toán'
END
FROM orders.order_list o
WHERE o.id = l.order_list_id;

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
  v_old_ok boolean;
  v_new_ok boolean;
BEGIN
  IF NEW.supply_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    UPDATE partner.supplier_order_cost_log
    SET ncc_payment_status = CASE
      WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc
      ELSE v_chua_tt_ncc
    END
    WHERE order_list_id = NEW.id;
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


-- ========== 045_supplier_payments_text_columns.sql ==========

-- partner.supplier_payments: payment_period / payment_status kiểu TEXT (migration 047 thêm supplier_payment_ledger, bỏ total_amount).
-- Mở rộng kỳ thanh toán / nhãn trạng thái (chuỗi dài, khoảng ngày, v.v.)
ALTER TABLE partner.supplier_payments
  ALTER COLUMN payment_period TYPE TEXT,
  ALTER COLUMN payment_status TYPE TEXT;


-- ========== 046_supplier_order_cost_log_sync_processing.sql ==========

-- Đồng bộ log khi đơn vẫn «Đang Xử Lý»: đổi NCC → xóa + tạo lại dòng; đổi cost/refund/id_order → UPDATE.
-- (Công nợ theo đơn chỉ còn trên partner.supplier_order_cost_log, không cộng supplier_payments.)

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
BEGIN
  IF NEW.supply_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    UPDATE partner.supplier_order_cost_log
    SET ncc_payment_status = CASE
      WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc
      ELSE v_chua_tt_ncc
    END
    WHERE order_list_id = NEW.id;
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

  v_new_processing := (NEW.status = v_processing);
  IF NOT v_new_processing THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
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
      CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END
    )
    ON CONFLICT (order_list_id) DO NOTHING;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old_processing := (OLD.status = v_processing);

    IF NOT v_old_processing THEN
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
        CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END
      )
      ON CONFLICT (order_list_id) DO NOTHING;
      RETURN NEW;
    END IF;

    IF OLD.supply_id IS DISTINCT FROM NEW.supply_id THEN
      DELETE FROM partner.supplier_order_cost_log WHERE order_list_id = NEW.id;
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
        CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END
      );
      RETURN NEW;
    END IF;

    IF EXISTS (SELECT 1 FROM partner.supplier_order_cost_log WHERE order_list_id = NEW.id) THEN
      UPDATE partner.supplier_order_cost_log
      SET
        supply_id = NEW.supply_id,
        id_order = COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
        import_cost = COALESCE(NEW.cost, 0),
        refund_amount = COALESCE(NEW.refund, 0),
        ncc_payment_status = CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END,
        logged_at = NOW()
      WHERE order_list_id = NEW.id;
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
        CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END
      )
      ON CONFLICT (order_list_id) DO NOTHING;
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


-- ========== 047_supplier_payment_ledger_drop_total_amount.sql ==========

-- Ghi nhận mỗi phát sinh (Sepay / thủ công / carryover) vào partner.supplier_payment_ledger.
-- Bỏ total_amount trên supplier_payments; giữ id cũ khi migrate để API confirm vẫn khớp.

CREATE TABLE IF NOT EXISTS partner.supplier_payment_ledger (
  id              BIGSERIAL PRIMARY KEY,
  supplier_id     INTEGER NOT NULL REFERENCES partner.supplier(id),
  amount          NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(18,2) NOT NULL DEFAULT 0,
  payment_period  TEXT,
  payment_status  TEXT,
  note            TEXT,
  source          TEXT NOT NULL DEFAULT 'manual',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_payment_ledger_supplier_created
  ON partner.supplier_payment_ledger (supplier_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'partner'
      AND table_name = 'supplier_payments'
      AND column_name = 'total_amount'
  ) THEN
    INSERT INTO partner.supplier_payment_ledger (
      id,
      supplier_id,
      amount,
      amount_paid,
      payment_period,
      payment_status,
      note,
      source,
      created_at
    )
    SELECT
      id,
      supplier_id,
      COALESCE(total_amount, 0),
      COALESCE(amount_paid, 0),
      payment_period,
      payment_status,
      NULL,
      'legacy',
      NOW()
    FROM partner.supplier_payments sp
    WHERE EXISTS (SELECT 1 FROM partner.supplier s WHERE s.id = sp.supplier_id)
    ON CONFLICT (id) DO NOTHING;

    PERFORM setval(
      pg_get_serial_sequence('partner.supplier_payment_ledger', 'id'),
      GREATEST((SELECT COALESCE(MAX(id), 1) FROM partner.supplier_payment_ledger), 1)
    );
  END IF;
END $$;

ALTER TABLE partner.supplier_payments DROP COLUMN IF EXISTS total_amount;


-- ========== 048_drop_supplier_payment_ledger.sql ==========

-- Bỏ supplier_payment_ledger; chu kỳ / Sepay / confirm dùng lại partner.supplier_payments (+ total_amount).
DROP TABLE IF EXISTS partner.supplier_payment_ledger;

ALTER TABLE partner.supplier_payments
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(18,2);


-- ========== 049_supplier_order_cost_log_unpaid_renewal_to_processing.sql ==========

-- Chỉ ghi partner.supplier_order_cost_log khi đơn chuyển «Chưa Thanh Toán» hoặc «Cần Gia Hạn» → «Đang Xử Lý» (ghi cost NCC).
-- Không tạo log khi INSERT thẳng trạng thái Đang Xử Lý; khi đã Đang XL vẫn đồng bộ đổi NCC / cost / hoàn.

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
BEGIN
  IF NEW.supply_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    UPDATE partner.supplier_order_cost_log
    SET ncc_payment_status = CASE
      WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc
      ELSE v_chua_tt_ncc
    END
    WHERE order_list_id = NEW.id;
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
        CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END
      )
      ON CONFLICT (order_list_id) DO NOTHING;
      RETURN NEW;
    END IF;

    IF OLD.supply_id IS DISTINCT FROM NEW.supply_id THEN
      DELETE FROM partner.supplier_order_cost_log WHERE order_list_id = NEW.id;
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
        CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END
      );
      RETURN NEW;
    END IF;

    IF EXISTS (SELECT 1 FROM partner.supplier_order_cost_log WHERE order_list_id = NEW.id) THEN
      UPDATE partner.supplier_order_cost_log
      SET
        supply_id = NEW.supply_id,
        id_order = COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
        import_cost = COALESCE(NEW.cost, 0),
        refund_amount = COALESCE(NEW.refund, 0),
        ncc_payment_status = CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END,
        logged_at = NOW()
      WHERE order_list_id = NEW.id;
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
        CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END
      )
      ON CONFLICT (order_list_id) DO NOTHING;
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


-- ========== 050_supplier_order_cost_log_refund_off_processing.sql ==========

-- Đồng bộ import_cost / refund_amount vào partner.supplier_order_cost_log khi đơn đã có log
-- nhưng NEW.status không còn «Đang Xử Lý» (vd. Chờ Hoàn + cột refund cập nhật cùng lúc).
-- Trước đây trigger return sớm nên bỏ qua nhánh UPDATE khi đã rời ĐXL.

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
BEGIN
  IF NEW.supply_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    UPDATE partner.supplier_order_cost_log
    SET ncc_payment_status = CASE
      WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc
      ELSE v_chua_tt_ncc
    END
    WHERE order_list_id = NEW.id;
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

  IF TG_OP = 'UPDATE'
     AND EXISTS (SELECT 1 FROM partner.supplier_order_cost_log WHERE order_list_id = NEW.id)
     AND (
       NEW.refund IS DISTINCT FROM OLD.refund
       OR NEW.cost IS DISTINCT FROM OLD.cost
       OR NEW.supply_id IS DISTINCT FROM OLD.supply_id
       OR NEW.id_order IS DISTINCT FROM OLD.id_order
     )
  THEN
    IF NEW.status IS DISTINCT FROM v_processing THEN
      UPDATE partner.supplier_order_cost_log
      SET
        supply_id = NEW.supply_id,
        id_order = COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
        import_cost = COALESCE(NEW.cost, 0),
        refund_amount = COALESCE(NEW.refund, 0),
        ncc_payment_status = CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END,
        logged_at = NOW()
      WHERE order_list_id = NEW.id;
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
        CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END
      )
      ON CONFLICT (order_list_id) DO NOTHING;
      RETURN NEW;
    END IF;

    IF OLD.supply_id IS DISTINCT FROM NEW.supply_id THEN
      DELETE FROM partner.supplier_order_cost_log WHERE order_list_id = NEW.id;
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
        CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END
      );
      RETURN NEW;
    END IF;

    IF EXISTS (SELECT 1 FROM partner.supplier_order_cost_log WHERE order_list_id = NEW.id) THEN
      UPDATE partner.supplier_order_cost_log
      SET
        supply_id = NEW.supply_id,
        id_order = COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
        import_cost = COALESCE(NEW.cost, 0),
        refund_amount = COALESCE(NEW.refund, 0),
        ncc_payment_status = CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END,
        logged_at = NOW()
      WHERE order_list_id = NEW.id;
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
        CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END
      )
      ON CONFLICT (order_list_id) DO NOTHING;
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


-- ========== 051_supplier_order_cost_log_initial_ncc_unpaid.sql ==========

-- INSERT mới vào partner.supplier_order_cost_log: ncc_payment_status luôn «Chưa Thanh Toán».
-- Trạng thái TT NCC sau đó vẫn do khối UPDATE đầu function (theo orders.order_list.status).

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
BEGIN
  IF NEW.supply_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    UPDATE partner.supplier_order_cost_log
    SET ncc_payment_status = CASE
      WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc
      ELSE v_chua_tt_ncc
    END
    WHERE order_list_id = NEW.id;
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

  IF TG_OP = 'UPDATE'
     AND EXISTS (SELECT 1 FROM partner.supplier_order_cost_log WHERE order_list_id = NEW.id)
     AND (
       NEW.refund IS DISTINCT FROM OLD.refund
       OR NEW.cost IS DISTINCT FROM OLD.cost
       OR NEW.supply_id IS DISTINCT FROM OLD.supply_id
       OR NEW.id_order IS DISTINCT FROM OLD.id_order
     )
  THEN
    IF NEW.status IS DISTINCT FROM v_processing THEN
      UPDATE partner.supplier_order_cost_log
      SET
        supply_id = NEW.supply_id,
        id_order = COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
        import_cost = COALESCE(NEW.cost, 0),
        refund_amount = COALESCE(NEW.refund, 0),
        ncc_payment_status = CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END,
        logged_at = NOW()
      WHERE order_list_id = NEW.id;
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
      )
      ON CONFLICT (order_list_id) DO NOTHING;
      RETURN NEW;
    END IF;

    IF OLD.supply_id IS DISTINCT FROM NEW.supply_id THEN
      DELETE FROM partner.supplier_order_cost_log WHERE order_list_id = NEW.id;
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

    IF EXISTS (SELECT 1 FROM partner.supplier_order_cost_log WHERE order_list_id = NEW.id) THEN
      UPDATE partner.supplier_order_cost_log
      SET
        supply_id = NEW.supply_id,
        id_order = COALESCE(NULLIF(TRIM(NEW.id_order::text), ''), ''),
        import_cost = COALESCE(NEW.cost, 0),
        refund_amount = COALESCE(NEW.refund, 0),
        ncc_payment_status = CASE WHEN NEW.status IS NOT DISTINCT FROM v_paid THEN v_da_tt_ncc ELSE v_chua_tt_ncc END,
        logged_at = NOW()
      WHERE order_list_id = NEW.id;
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
      )
      ON CONFLICT (order_list_id) DO NOTHING;
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


-- ========== 052_supplier_order_cost_log_multi_row.sql ==========

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


-- ========== 053_supplier_order_cost_log_first_on_cost.sql ==========

-- Ưu tiên ghi log NCC khi phát sinh cost (hoặc gán NCC) trước các nhánh khác:
-- - INSERT đơn: có supply_id và cost <> 0 (ngoài MAVN+ĐXL đã xử lý riêng).
-- - UPDATE: chưa có dòng log, đổi cost/supply_id, và không phải cùng lần Chưa TT/Cần GH → ĐXL (nhánh đó vẫn INSERT riêng).

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

  -- MAVN: đơn tạo xong đã «Đang Xử Lý» (kể cả cost = 0)
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

  -- INSERT đơn khác: đã có NCC và phát sinh cost (> 0)
  IF TG_OP = 'INSERT'
     AND COALESCE(NEW.cost, 0) IS DISTINCT FROM 0
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

  -- UPDATE: lần đầu có cost / đổi NCC khi chưa có log (không gộp với Chưa TT/Cần GH → ĐXL)
  IF TG_OP = 'UPDATE'
     AND NOT EXISTS (SELECT 1 FROM partner.supplier_order_cost_log WHERE order_list_id = NEW.id)
     AND (
       NEW.cost IS DISTINCT FROM OLD.cost
       OR NEW.supply_id IS DISTINCT FROM OLD.supply_id
     )
     AND NOT (
       NEW.status = v_processing
       AND (OLD.status IS NOT DISTINCT FROM v_unpaid OR OLD.status IS NOT DISTINCT FROM v_renewal)
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


-- ========== 054_supplier_order_cost_log_insert_each_processing_entry.sql ==========

-- Mỗi lần Chưa Thanh Toán / Cần Gia Hạn → Đang Xử Lý: luôn INSERT dòng log mới (logged_at = NOW()),
-- không UPDATE dòng cũ — ví dụ thanh toán 14/3 một dòng, gia hạn 14/4 thêm dòng thứ hai.

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

  IF TG_OP = 'INSERT'
     AND COALESCE(NEW.cost, 0) IS DISTINCT FROM 0
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

  IF TG_OP = 'UPDATE'
     AND NOT EXISTS (SELECT 1 FROM partner.supplier_order_cost_log WHERE order_list_id = NEW.id)
     AND (
       NEW.cost IS DISTINCT FROM OLD.cost
       OR NEW.supply_id IS DISTINCT FROM OLD.supply_id
     )
     AND NOT (
       NEW.status = v_processing
       AND (OLD.status IS NOT DISTINCT FROM v_unpaid OR OLD.status IS NOT DISTINCT FROM v_renewal)
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
