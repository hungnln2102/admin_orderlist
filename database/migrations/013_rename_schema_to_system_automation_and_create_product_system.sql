-- Migration: 013_rename_schema_to_system_automation_and_create_product_system
-- 1) Đổi tên schema system_renew_adobe → system_automation
-- 2) Tạo bảng product_system (variant_id, system_code) để ánh xạ sản phẩm thuộc hệ thống nào (fix_adobe_edu, renew_adobe, renew_zoom, otp_netflix...)
-- Chạy: psql "$DATABASE_URL" -f database/migrations/013_rename_schema_to_system_automation_and_create_product_system.sql

BEGIN;

-- Đổi tên schema (toàn bộ bảng trong schema đổi theo)
ALTER SCHEMA system_renew_adobe RENAME TO system_automation;

-- Bảng ánh xạ variant (sản phẩm) → hệ thống automation (dùng cho job/lỗi hàng loạt: lấy variant_id → order_list)
CREATE TABLE IF NOT EXISTS system_automation.product_system (
  id          SERIAL PRIMARY KEY,
  variant_id  INTEGER NOT NULL,
  system_code VARCHAR(64) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (variant_id, system_code)
);

COMMENT ON TABLE system_automation.product_system IS 'Ánh xạ variant (sản phẩm) thuộc hệ thống automation nào. Job hàng loạt: lấy variant_id theo system_code → query order_list (id_product IN ...) để lấy danh sách đơn.';
COMMENT ON COLUMN system_automation.product_system.system_code IS 'Mã hệ thống: fix_adobe_edu, renew_adobe, renew_zoom, otp_netflix, ...';

CREATE INDEX IF NOT EXISTS idx_product_system_system_code ON system_automation.product_system (system_code);
CREATE INDEX IF NOT EXISTS idx_product_system_variant_id ON system_automation.product_system (variant_id);

COMMIT;
