-- ============================================================================
-- 035 — partner.supplier.account_holder: chủ tài khoản (VietQR / hiển thị)
-- Idempotent: ADD COLUMN IF NOT EXISTS.
-- ============================================================================

BEGIN;

ALTER TABLE partner.supplier
  ADD COLUMN IF NOT EXISTS account_holder VARCHAR(255);

COMMIT;
