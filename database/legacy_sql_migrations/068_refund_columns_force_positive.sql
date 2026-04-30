-- Chuẩn hóa dữ liệu hiện tại:
-- - orders.order_list.refund luôn lưu số dương
-- - partner.supplier_order_cost_log.refund_amount luôn lưu số dương

UPDATE orders.order_list
SET refund = ABS(COALESCE(refund, 0))
WHERE refund IS NOT NULL;

UPDATE partner.supplier_order_cost_log
SET refund_amount = ABS(COALESCE(refund_amount, 0))
WHERE refund_amount IS NOT NULL;

