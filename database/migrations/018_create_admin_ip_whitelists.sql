-- Migration: 018_create_admin_ip_whitelists
-- Mô tả:
--   Tạo bảng admin.ip_whitelist để quản lý danh sách IP được phép truy cập.

BEGIN;

CREATE SCHEMA IF NOT EXISTS admin;

CREATE TABLE IF NOT EXISTS admin.ip_whitelist (
  id BIGSERIAL PRIMARY KEY,
  ip_address VARCHAR(128) NOT NULL UNIQUE,
  label VARCHAR(100) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_whitelist_created_at
  ON admin.ip_whitelist (created_at DESC);

COMMIT;
