-- Migration: 008_rename_order_expired_to_expiry_date
-- Đổi tên cột order_expired → expiry_date trong order_list (refactor thống nhất tên).
-- Chạy: psql "$DATABASE_URL" -f database/migrations/008_rename_order_expired_to_expiry_date.sql

BEGIN;

ALTER TABLE orders.order_list
  RENAME COLUMN order_expired TO expiry_date;

COMMENT ON COLUMN orders.order_list.expiry_date IS 'Ngày hết hạn đơn hàng (trước đây: order_expired).';

COMMIT;
