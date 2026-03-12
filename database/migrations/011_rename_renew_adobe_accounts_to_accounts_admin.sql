-- Migration: 011_rename_renew_adobe_accounts_to_accounts_admin
-- Đổi tên bảng system_renew_adobe.account → accounts_admin để tránh trùng tên với identity.accounts
-- Chạy: psql "$DATABASE_URL" -f database/migrations/011_rename_renew_adobe_accounts_to_accounts_admin.sql

BEGIN;

ALTER TABLE IF EXISTS system_renew_adobe.account RENAME TO accounts_admin;

COMMENT ON TABLE system_renew_adobe.accounts_admin IS 'Tài khoản admin Renew Adobe (đổi tên từ account để tránh trùng identity.accounts).';

COMMIT;
