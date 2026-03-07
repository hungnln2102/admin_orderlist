-- Migration: 009_create_system_renew_adobe_schema
-- Tạo schema system_renew_adobe và bảng account cho form Renew Adobe (docs/Adobe_Auto_Login (2).md).
-- Chạy: psql "$DATABASE_URL" -f database/migrations/009_create_system_renew_adobe_schema.sql

BEGIN;

CREATE SCHEMA IF NOT EXISTS system_renew_adobe;

CREATE TABLE IF NOT EXISTS system_renew_adobe.account (
  id              SERIAL PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  password_enc    TEXT NOT NULL,
  access_token    TEXT,
  token_expires   TIMESTAMPTZ,
  adobe_org_id    TEXT,
  org_name        TEXT,
  org_type        TEXT,
  license_status  TEXT DEFAULT 'unknown',
  license_detail  TEXT,
  user_count      INTEGER DEFAULT 0,
  users_snapshot  TEXT,
  alert_target    TEXT,
  last_checked    TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE system_renew_adobe.account IS 'Tài khoản admin Renew Adobe (email, org_name, license_status, user_count).';

COMMIT;
