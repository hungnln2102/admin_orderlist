-- Bổ sung cột định danh giao dịch Sepay để chống trùng webhook retry.
ALTER TABLE orders.payment_receipt
  ADD COLUMN IF NOT EXISTS sepay_transaction_id BIGINT,
  ADD COLUMN IF NOT EXISTS reference_code VARCHAR(255),
  ADD COLUMN IF NOT EXISTS transfer_type VARCHAR(16),
  ADD COLUMN IF NOT EXISTS gateway VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sub_account VARCHAR(255);

-- Tránh insert trùng khi Sepay gửi lại cùng transaction id.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_receipt_sepay_transaction_id
  ON orders.payment_receipt (sepay_transaction_id)
  WHERE sepay_transaction_id IS NOT NULL;

-- Fallback khi transaction id thiếu: tăng tốc tìm duplicate theo reference + type + amount + ngày.
CREATE INDEX IF NOT EXISTS idx_payment_receipt_reference_fallback
  ON orders.payment_receipt (reference_code, transfer_type, amount, payment_date);
