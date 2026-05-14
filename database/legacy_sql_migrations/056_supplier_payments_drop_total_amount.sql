-- Xóa cột total_amount trên partner.supplier_payments (chu kỳ chỉ còn amount_paid, payment_period, payment_status).
ALTER TABLE partner.supplier_payments DROP COLUMN IF EXISTS total_amount;
