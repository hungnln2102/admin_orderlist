-- Flow mới: supplier_payments.payment_status lưu nội dung chuyển khoản.
-- Không còn dùng cột payment_state.

DROP INDEX IF EXISTS partner.idx_supplier_payments_supplier_state;

ALTER TABLE partner.supplier_payments
  DROP COLUMN IF EXISTS payment_state;
