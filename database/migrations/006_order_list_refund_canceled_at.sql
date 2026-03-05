-- Migration: 006_order_list_refund_canceled_at
-- Mô tả: Thêm cột refund, canceled_at vào order_list để gom logic 3 tab (Đơn hàng / Hết hạn / Hoàn tiền) về một bảng.
-- Chạy: psql "$DATABASE_URL" -v schema=orders -f database/migrations/006_order_list_refund_canceled_at.sql
-- Hoặc thay "orders" bằng schema thực tế (DB_SCHEMA_ORDERS).

BEGIN;

-- Thay :schema bằng tên schema (mặc định orders)
ALTER TABLE orders.order_list ADD COLUMN IF NOT EXISTS refund numeric(18,2);
ALTER TABLE orders.order_list ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

COMMENT ON COLUMN orders.order_list.refund IS 'Số tiền hoàn; chỉ ghi khi đơn chuyển sang Hoàn tiền.';
COMMENT ON COLUMN orders.order_list.canceled_at IS 'Thời điểm hủy đơn; chỉ ghi khi chuyển sang Hoàn tiền.';

COMMIT;
