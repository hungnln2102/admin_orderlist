-- Migration: 005_order_supply_to_id_supply
-- Description: Đổi cột supply (text) thành id_supply (int) trong 3 bảng order
-- Lưu ý: Migration này cần migrate dữ liệu cũ (tên NCC -> id supplier) trước khi đổi cột.
-- Nếu bạn đã chạy ALTER TABLE thủ công, có thể bỏ qua file này.

BEGIN;

-- Bước 1: Thêm cột id_supply (nếu chưa có)
ALTER TABLE orders.order_list ADD COLUMN IF NOT EXISTS id_supply integer REFERENCES partner.supplier(id);
ALTER TABLE orders.order_expired ADD COLUMN IF NOT EXISTS id_supply integer REFERENCES partner.supplier(id);
ALTER TABLE orders.order_canceled ADD COLUMN IF NOT EXISTS id_supply integer REFERENCES partner.supplier(id);

-- Bước 2: Migrate dữ liệu (supply text -> id_supply int) - chạy nếu còn dữ liệu cũ
-- UPDATE orders.order_list o
-- SET id_supply = s.id
-- FROM partner.supplier s
-- WHERE TRIM(supplier_name) = TRIM(o.supply) AND o.supply IS NOT NULL;
-- (Tương tự cho order_expired, order_canceled)

-- Bước 3: Xóa cột supply cũ (chỉ chạy sau khi đã migrate xong)
-- ALTER TABLE orders.order_list DROP COLUMN IF EXISTS supply;
-- ALTER TABLE orders.order_expired DROP COLUMN IF EXISTS supply;
-- ALTER TABLE orders.order_canceled DROP COLUMN IF EXISTS supply;

COMMIT;
