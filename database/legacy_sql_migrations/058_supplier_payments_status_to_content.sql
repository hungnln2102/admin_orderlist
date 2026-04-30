-- Đổi vai trò cột:
-- - payment_state: trạng thái chu kỳ (Chưa Thanh Toán / Đã Thanh Toán)
-- - payment_status: nội dung chuyển khoản (QR description)

ALTER TABLE partner.supplier_payments
  ADD COLUMN IF NOT EXISTS payment_state TEXT;

UPDATE partner.supplier_payments
SET payment_state = CASE
  WHEN payment_state IS NOT NULL AND BTRIM(payment_state) <> '' THEN payment_state
  WHEN BTRIM(COALESCE(payment_status, '')) IN ('Chưa Thanh Toán', 'Đã Thanh Toán')
    THEN BTRIM(payment_status)
  ELSE 'Chưa Thanh Toán'
END;

ALTER TABLE partner.supplier_payments
  ALTER COLUMN payment_state SET DEFAULT 'Chưa Thanh Toán';

UPDATE partner.supplier_payments
SET payment_status = ''
WHERE BTRIM(COALESCE(payment_status, '')) IN ('Chưa Thanh Toán', 'Đã Thanh Toán');

CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_state
  ON partner.supplier_payments(supplier_id, payment_state);
