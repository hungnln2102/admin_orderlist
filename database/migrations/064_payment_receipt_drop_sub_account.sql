-- Bỏ cột sub_account theo yêu cầu nghiệp vụ.
ALTER TABLE orders.payment_receipt
  DROP COLUMN IF EXISTS sub_account;
