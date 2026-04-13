-- Bỏ supplier_payment_ledger; chu kỳ / Sepay / confirm dùng lại partner.supplier_payments (+ total_amount).
DROP TABLE IF EXISTS partner.supplier_payment_ledger;

ALTER TABLE partner.supplier_payments
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(18,2);
