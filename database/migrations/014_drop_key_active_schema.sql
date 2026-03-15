-- Migration: 014_drop_key_active_schema
-- Xóa schema key_active (order_auto_keys, systems). Mã đơn hàng dùng trực tiếp từ order_list.
-- Lưu ý: Refactor code đang dùng TBL_KEY (RenewAdobeController, cleanupExpiredAdobeUsers, KeyActiveController) trước hoặc sau khi chạy.
-- Chạy: node backend/scripts/run-migration-014.js

BEGIN;

DROP TABLE IF EXISTS key_active.order_auto_keys;
DROP TABLE IF EXISTS key_active.systems;
DROP SCHEMA IF EXISTS key_active;

COMMIT;
