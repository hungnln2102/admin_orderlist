-- Migration: 019_create_admin_site_settings
-- Mô tả:
--   Tạo bảng admin.site_settings để lưu cấu hình website như maintenance mode.

BEGIN;

CREATE SCHEMA IF NOT EXISTS admin;

CREATE TABLE IF NOT EXISTS admin.site_settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO admin.site_settings (key, value)
VALUES ('maintenance_mode', 'off')
ON CONFLICT (key) DO NOTHING;

COMMIT;
