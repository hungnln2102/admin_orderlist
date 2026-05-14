-- partner.supplier_payments: payment_period / payment_status kiểu TEXT (migration 047 thêm supplier_payment_ledger, bỏ total_amount).
-- Mở rộng kỳ thanh toán / nhãn trạng thái (chuỗi dài, khoảng ngày, v.v.)
ALTER TABLE partner.supplier_payments
  ALTER COLUMN payment_period TYPE TEXT,
  ALTER COLUMN payment_status TYPE TEXT;
