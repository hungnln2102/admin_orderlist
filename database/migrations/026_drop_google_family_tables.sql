-- Migration: 026_drop_google_family_tables
-- Gỡ bảng Google Family automation khỏi system_automation; kèm legacy schema system_google_family (nếu còn).
-- Chạy: npm run migrate:026

BEGIN;

DROP TABLE IF EXISTS system_automation.google_family_session_check_log;
DROP TABLE IF EXISTS system_automation.google_family_manager_account;

-- Legacy schema (nếu còn từ bản migration cũ): CASCADE xóa toàn bộ object trong schema.
DROP SCHEMA IF EXISTS system_google_family CASCADE;

COMMIT;
