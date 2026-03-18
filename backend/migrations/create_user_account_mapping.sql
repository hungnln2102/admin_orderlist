-- Migration: Tạo bảng user_account_mapping trong schema system_automation
-- Mục đích: Track mapping giữa user email và Adobe account để hỗ trợ auto-reassign

CREATE TABLE IF NOT EXISTS system_automation.user_account_mapping (
    id          SERIAL PRIMARY KEY,
    user_email  TEXT NOT NULL,
    account_id  INTEGER NOT NULL REFERENCES system_automation.accounts_admin(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    removed_at  TIMESTAMPTZ,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- Index để query nhanh theo email
CREATE INDEX IF NOT EXISTS idx_uam_user_email  ON system_automation.user_account_mapping(user_email);
-- Index để query nhanh theo account
CREATE INDEX IF NOT EXISTS idx_uam_account_id  ON system_automation.user_account_mapping(account_id);
-- Index để lọc mapping đang active
CREATE INDEX IF NOT EXISTS idx_uam_is_active   ON system_automation.user_account_mapping(is_active);
-- Index composite: tìm mapping active của 1 user nhanh
CREATE INDEX IF NOT EXISTS idx_uam_email_active ON system_automation.user_account_mapping(user_email, is_active);
