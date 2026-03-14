-- Migration: 012_order_list_id_order_unique
-- Mô tả: Thêm UNIQUE constraint trên id_order trong order_list để tránh 2 đơn trùng mã.
-- Chạy: psql "$DATABASE_URL" -f database/migrations/012_order_list_id_order_unique.sql
--
-- LƯU Ý: Trước khi chạy, cần xử lý các bản ghi trùng id_order (nếu có).
-- Chạy query kiểm tra:
--   SELECT id_order, COUNT(*) FROM orders.order_list GROUP BY id_order HAVING COUNT(*) > 1;
-- Nếu có kết quả, cần sửa thủ công hoặc xóa bản ghi trùng trước khi tạo constraint.

BEGIN;

-- Xóa index cũ (không UNIQUE) nếu tồn tại, sẽ thay bằng UNIQUE index
DROP INDEX IF EXISTS orders.idx_order_list_id_order_lower;

-- Tạo UNIQUE index (case-insensitive) trên id_order
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_list_id_order_unique
ON orders.order_list (UPPER(id_order))
WHERE id_order IS NOT NULL;

COMMIT;
