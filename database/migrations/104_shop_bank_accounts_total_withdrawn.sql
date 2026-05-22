-- Số tiền đã rút khỏi STK (ghi tay; số dư = tổng CK Sepay − total_withdrawn).
ALTER TABLE admin.shop_bank_accounts
  ADD COLUMN IF NOT EXISTS total_withdrawn numeric(18, 2) NOT NULL DEFAULT 0;

ALTER TABLE admin.shop_bank_accounts
  DROP CONSTRAINT IF EXISTS shop_bank_accounts_total_withdrawn_nonneg;

ALTER TABLE admin.shop_bank_accounts
  ADD CONSTRAINT shop_bank_accounts_total_withdrawn_nonneg
  CHECK (total_withdrawn >= 0);

COMMENT ON COLUMN admin.shop_bank_accounts.total_withdrawn IS
  'Tổng tiền admin ghi nhận đã rút khỏi STK này. Số dư = SUM(payment_receipt vào STK) − total_withdrawn.';
